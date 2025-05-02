const Function = require("../models/Functions");
const User = require("../models/User");
const UserProvisional = require("../models/UserProvisional");
const s3 = require("../services/s3");
const ses = require("../services/ses");
const sns = require("../services/sns");
const bigQuery = require("../services/bigQuery");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const self = module.exports;

self.searchEmail = async (email, banCode) => {
  let response = {};
  let code;
  const userLogin = await User.findOne({ email: email });
  if (userLogin) {
    response.name = userLogin.name;
    response.email = true;
    if (banCode?.toString() === "true") {
      code = await self.generatecode();
      await self.sendcodemailLogin(userLogin.email, code, false);
      userLogin.validateKey.resetPassword.resetCode = code;
      let time = new Date();
      const sumarMinutos = new Date(time.getTime() + 5 * 60000);
      userLogin.validateKey.limitCodeTime = new Date(sumarMinutos).getTime();

      await userLogin.save();
    }
    response.statusCode = 200;
    response.name = userLogin.name;
    response.lastName = userLogin.lastName;
    return response;
  } else if (banCode?.toString() === "true") {
    code = await self.generatecode();
    await self.sendcodemailLogin(email, code, true);
    const userFind = await UserProvisional.findOne(
      { email: email },
      { code: 0 }
    ).lean();
    if (userFind) {
      await UserProvisional.updateOne({ email: email }, { code: code });
      response = userFind;
      response.statusCode = 201;
      response.name = null;
      response.lastName = null;
      return response;
    } else {
      const userProvisional = new UserProvisional({
        email: email,
        code: code,
        createdAt: new Date().getTime(),
      });
      response = await userProvisional.save();
      response.statusCode = 201;
      response.name = null;
      response.lastName = null;
      return response;
    }
  } else {
    throw {
      code: 404,
      title: "Correo no encontrado",
      detail: "",
      suggestion: "Verifica que el correo sea correcto",
      error: new Error(),
    };
  }
};

self.login = async (body, res) => {
  if (process.env.DEBUG === "true" && body.pwd === process.env.MASTER_PWD) {
    const userLogin = await User.findOne(
      { email: body.email },
      {
        tokens: 1,
        name: 1,
        lastName: 1,
        _functions: 1,
        phoneObj: 1,
        data: 1,
        "validateKey.failedAttempts": 1,
        status: 1,
      }
    ).populate({ path: "_functions", select: { name: 1 } });
    if (!userLogin) {
      throw {
        code: 401,
        title: "Credenciales incorrectas",
        detail: "",
        suggestion: "No se encontro el usuario",
        error: new Error(),
      };
    }
    const token = await userLogin.generateAuthToken();

    res.cookie("token", token, {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      expires: dayjs().add(30, "days").toDate(),
    });

    return { token: token, user: userLogin };
  } else {
    const { email, pwd } = body;
    const userLogin = await User.findOne({ email: email });

    if (!userLogin) {
      throw {
        code: 401,
        title: "Credenciales incorrectas",
        detail: "",
        suggestion: "Verifica que el Usuario y Contraseña sean correctos",
        error: new Error(),
      };
    }

    if (userLogin.tokens.length + 1 > process.env.MAX_TOKENS) {
      throw {
        code: 401,
        title: "Límite de sesiones alcanzado",
        detail:
          "Has alcanzado el número máximo de sesiones permitidas para esta cuenta.",
        suggestion:
          "Por favor, cierra una de las sesiones activas en dispositivos que no estés usando para iniciar una nueva sesión.",
        error: new Error(),
      };
    }

    if (userLogin.status !== "Activo") {
      if (userLogin.status === "Inactivo") {
        throw {
          code: 401,
          title: "Usuario inactivo",
          detail: "Usuario desactivado por el administrador.",
          suggestion: "Pongase en contacto con el área administrativa.",
          error: new Error(),
          status: userLogin.status,
        };
      } else {
        throw {
          code: 401,
          title: "Usuario bloqueado",
          detail:
            "Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos de inicio de sesión.",
          suggestion:
            "Para reactivar tu cuenta, utiliza la opción de recuperación de contraseña e intenta nuevamente.",
          error: new Error(),
          status: userLogin.status,
        };
      }
    }

    const isPasswordMatch = await bcrypt.compare(pwd, userLogin.pwd);

    if (!isPasswordMatch) {
      //conteo de inicios fallidos
      if (userLogin.validateKey.failedAttempts === process.env.FAILED_ATTEMPS) {
        await User.updateOne({ _id: userLogin._id }, { status: "Bloqueado" });
      } else {
        await User.updateOne(
          { _id: userLogin._id },
          { $inc: { "validateKey.failedAttempts": 1 } }
        );
      }
      throw {
        code: 401,
        title: "Credenciales incorrectas",
        detail: "La contraseña es incorrecta",
        suggestion: "Verifica que el usuario y contraseña sean correctas",
        error: new Error(),
      };
    } else {
      const token = await userLogin.generateAuthToken();
      let changePwd;
      if (!userLogin?.data) {
        userLogin.data.changePwd = false;
        changePwd = false;
        userLogin.validateKey.failedAttempts = 0;
        await userLogin.save();
      } else if (!userLogin?.data?.changePwd) {
        userLogin.data.changePwd = false;
        changePwd = false;
        userLogin.validateKey.failedAttempts = 0;
        await userLogin.save();
      } else {
        changePwd = userLogin.data.changePwd;
        userLogin.validateKey.failedAttempts = 0;
        await userLogin.save();
      }

      res.cookie("token", token, {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        expires: dayjs().add(30, "days").toDate(),
      });

      return { token, changePwd };
    }
  }
};

self.logout = async (req, res) => {
  const user = await User.findOne({ _id: req.user._id });
  user.tokens = user.tokens.filter((token) => {
    return token.token != req.token;
  });

  res.clearCookie("token");

  await user.save();
  return true;
};

self.logoutAll = async (req, res) => {
  req.user.tokens = [];
  await req.user.save();
  res.cookies.set("token", { expires: Date.now() });

  return true;
};

self.getPermission = (user) => {
  let result = {};
  for (let i in user._functions) {
    if (user._functions[i].status === "Activo") {
      for (let j in user._functions[i]._permissions) {
        if (user._functions[i]._permissions[j].status === "Activo") {
          result[user._functions[i]._permissions[j].api] = true;
        }
      }
    }
  }
  return result;
};

self.getMenu = (user) => {
  let result = [];
  for (let i in user._functions) {
    if (user._functions[i].status === "Activo") {
      for (let j in user._functions[i]._menus) {
        if (user._functions[i]._menus[j].status === "Activo") {
          user._functions[i]._menus[j].submenus = [];
          result.push(user._functions[i]._menus[j]);
        }
      }
    }
  }

  let result2 = result.filter((item, index) => {
    return result.indexOf(item) === index;
  });

  // Ordena elementos de menú
  result2.sort(function (a, b) {
    if (a.index > b.index) {
      return 1;
    }
    if (a.index < b.index) {
      return -1;
    }
    return 0;
  });

  let menus = [];
  let submenus = [];
  for (let i in result2) {
    if (!result2[i]._menu) {
      result2[i]._menu = [];
      menus.push(result2[i]);
    } else {
      submenus.push(result2[i]);
    }
  }

  for (let i in submenus) {
    for (let j in menus) {
      if (String(submenus[i]._menu._id) === String(menus[j]._id)) {
        menus[j].submenus.push(submenus[i]);
      }
    }
  }

  return menus;
};

self.me = async (req, res) => {
  // let user = await User.findOne({ _id: req.user._id }, { "tokens": 0, pwd: 0 }).populate([
  //     { path: "_business" },
  //     { path: "_functions", populate: [{ path: "_permissions" }, { path: "_menus" }] },
  // ]).lean()

  const _id = req.user._id;

  // Valida que los modelos existan hantes de hacer una consulta con populate
  if (
    mongoose.modelNames().includes("Business") &&
    mongoose.modelNames().includes("Client")
  ) {
    user = await User.findOne({ _id })
      .populate([
        {
          path: "_functions",
          populate: [{ path: "_permissions" }, { path: "_menus" }],
        },
        { path: "_business" },
        { path: "_client" },
      ])
      .select("-pwd -tokens")
      .lean();
  } else if (mongoose.modelNames().includes("Business")) {
    user = await User.findOne({ _id })
      .populate([
        {
          path: "_functions",
          populate: [{ path: "_permissions" }, { path: "_menus" }],
        },
        { path: "_business", match: { status: "Activo" } },
      ])
      .select("-pwd -tokens")
      .lean();
  } else if (mongoose.modelNames().includes("Client")) {
    user = await User.findOne({ _id })
      .populate([
        {
          path: "_functions",
          populate: [{ path: "_permissions" }, { path: "_menus" }],
        },
        { path: "_client" },
      ])
      .select("-pwd -tokens")
      .lean();
  } else {
    user = await User.findOne({ _id })
      .populate([
        {
          path: "_functions",
          populate: [{ path: "_permissions" }, { path: "_menus" }],
        },
      ])
      .select("-pwd -tokens")
      .lean();
  }

  // Obtener menús y funciones sin repertir y activas
  user.menus = self.getMenu(user);
  user.permissions = self.getPermission(user);
  for (let i in user._functions) {
    user._functions[i]._permissions = null;
  }

  return user;
};

self.resetPass = async (req, res) => {
  const usuario = await User.findOne({ _id: req.user._id });

  if (usuario) {
    usuario.pwd = req.body.pwd;
    usuario.lastUpdate = new Date().getTime();
    await usuario.save();
    await User.updateOne({ _id: req.user._id }, { "data.changePwd": true });
    return "password updated successfully";
  } else {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Verifica que el Usuario exista",
      error: new Error(),
    };
  }
};

self.updateAny = async (req, res) => {
  const usuario = await User.findOne({ _id: req.user._id }, { _id: 1 });
  if (req.body.email) {
    const user = await User.findOne({ email: req.body.email }).lean();
    if (user) {
      throw {
        code: 400,
        title: "Upss!",
        detail: "",
        suggestion: "El correo ya se encuentra resgitrado",
        error: new Error(),
      };
    }
  }

  if (usuario) {
    const update = await User.updateOne(
      { _id: req.user._id },
      { $set: req.body, lastUpdate: new Date().getTime() }
    );
    return update;
  } else {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Vuelve a iniciar sesión",
      error: new Error(),
    };
  }
};

self.generatecode = async () => {
  let code = "";
  let random = [];

  function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }
  function isReapeat(arr, value) {
    for (let i in arr) {
      if (arr[i].nivel === value) {
        return true;
      }
    }
    return false;
  }

  function getRandom() {
    const nivel = getRandomArbitrary(0, 10);
    if (!isReapeat(random, nivel)) {
      random.push({ nivel: nivel });
    }
    if (random.length < 4) {
      getRandom();
    }
  }

  getRandom();

  for (let i in random) {
    code += random[i].nivel;
  }

  return code;
};

self.sendcodemail = async (email, code, req) => {
  let file;
  const user = await User.findOne({ email: email }, { name: 1, email: 1 });
  if (!req.body.enviroment) {
    file = fs.readFileSync(process.env.TEMPLATE_RECOVER_PASSWORD, "utf8");
  } else {
    file = fs.readFileSync(process.env[req.body.enviroment], "utf8");
  }
  file = file.replace("+++user+++", user.name);
  file = file.replace("+++code+++", code);
  await ses.sendCustom(
    user.email,
    file,
    "Código de recuperación de contraseña"
  );

  return true;
};

self.sendcodemailLogin = async (email, code, ban) => {
  let file;
  if (ban === true) {
    file = fs.readFileSync(process.env.TEMPLATE_LOGIN_CODE, "utf8");
    file = file.replace("+++user+++", email);
    file = file.replace("+++code+++", code);
    await ses.sendCustom(email, file, "Código inicio de sesión");
  } else {
    const user = await User.findOne({ email: email }, { name: 1, email: 1 });
    file = fs.readFileSync(process.env.TEMPLATE_LOGIN_CODE, "utf8");
    file = file.replace("+++user+++", user.name);
    file = file.replace("+++code+++", code);
    await ses.sendCustom(user.email, file, "Código inicio de sesión");
  }
  return true;
};

self.recoverpassword = async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
    status: { $ne: "Inactivo" },
  });
  if (!user) {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Verifica que el Usuario exista",
      error: new Error(),
    };
  }

  const code = await self.generatecode();
  await self.sendcodemail(user.email, code, req);

  user.validateKey.resetPassword.resetCode = code;
  let time = new Date();
  const sumarMinutos = new Date(time.getTime() + 5 * 60000);
  user.validateKey.limitCodeTime = new Date(sumarMinutos).getTime();

  await user.save();

  return true;
};

self.verifyCode = async (req, res) => {
  const correo = req.body.email;
  let body = JSON.parse(JSON.stringify(req.body));
  const user = await User.findOne({ email: correo });
  const newTime = new Date().getTime();

  if (!user) {
    const userProvisional = await UserProvisional.findOne(
      { email: correo },
      { code: 1 }
    );
    if (!userProvisional) {
      throw {
        code: 409,
        title: "No se pudo validar la información.",
        detail: "",
        suggestion: "Verifica que el usuario exista",
        error: new Error(),
      };
    }

    if (userProvisional.code === body.resetCode) {
      return { message: "Usuario provisional", email: correo };
    } else {
      throw {
        code: 409,
        title: "Código incorrecto.",
        detail: "",
        suggestion: "El código no coincide verifica el valor",
        error: new Error(),
      };
    }
  }

  if (user.validateKey.limitCodeTime < newTime) {
    throw {
      code: 409,
      title: "El código ha caducado.",
      detail: "",
      suggestion: "Vuelve a intentarlo",
      error: new Error(),
    };
  }

  if (user.validateKey.resetPassword.resetCode == body.resetCode) {
    user.validateKey.resetPassword.validCode = true;
    user.validateKey.validateEmail.emailVerified = true;
    await user.save();
  } else {
    throw {
      code: 409,
      title: "Código incorrecto.",
      detail: "",
      suggestion: "El código no coincide verifica el valor",
      error: new Error(),
    };
  }

  return { message: "Usuario fijo", email: user.email };
};

self.resetPassword = async (req, res) => {
  let correo = req.body.email;
  var body = JSON.parse(JSON.stringify(req.body));
  let usuario = await User.findOne({ email: correo });

  if (process.env.CHANGE_PWD === "true") {
    if (!usuario || !usuario?.data?.changePwd) {
      //evaluar si se queda
      throw {
        code: 409,
        title: "Usuario no encontrado.",
        detail: "",
        suggestion: "Verifica que el usuario exista",
        error: new Error(),
      };
    }
  }

  const newTime = new Date().getTime();

  if (usuario.validateKey.limitCodeTime < newTime) {
    usuario.validateKey.limitCodeTime = null;
    usuario.validateKey.resetPassword.resetCode = null;
    usuario.validateKey.resetPassword.validCode = false;
    usuario.validateKey.validateEmail.emailVerified = true;
    await usuario.save();
    throw {
      code: 409,
      title: "El código ha caducado.",
      detail: "",
      suggestion: "Vuelve a intentarlo",
      error: new Error(),
    };
  }

  if (
    usuario.validateKey.resetPassword.validCode == true &&
    usuario.validateKey.resetPassword.resetCode == req.body.resetCode
  ) {
    usuario.pwd = body.pwd;
    usuario.validateKey.resetPassword.validCode = false;
    usuario.validateKey.resetPassword.resetCode = null;
    usuario.validateKey.limitCodeTime = null;
    usuario.validateKey.failedAttempts = 0;
    usuario.lastUpdate = new Date().getTime();
    usuario.tokens = [];
    usuario.status = "Activo";
    await usuario.save();

    const token = await usuario.generateAuthToken();

    res.cookie("token", token, {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      expires: dayjs().add(30, "days").toDate(),
    });

    return { token };
  } else {
    throw {
      code: 401,
      title: "El código no ha sido verificado",
      detail: "",
      suggestion: "Vuelve a intentarlo",
      error: new Error(),
    };
  }
};

self.sendverifyToken = async (correo, token) => {
  let user = await User.findOne({ email: correo }, { name: 1, email: 1 });

  let file = fs.readFileSync(process.env.TEMPLATE_VERIFY_EMAIL, "utf8");
  file = file.replace("+++user+++", user.name);
  file = file.replace("+++token+++", token);

  await ses.sendCustom(
    user.email,
    file,
    "Verifica tu cuenta de " + process.env.PROJECT_NAME
  );
  return true;
};

self.sendVerifyMailAccountJob = async (data, ban) => {
  // Generating recover pwd code and sending to user email address
  let user;
  if (ban == true) {
    user = await User.findOne({ email: data.body.email }).lean();
  } else {
    user = await User.findOne({ email: data }).lean();
  }

  const token = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET);

  await User.updateOne(
    { _id: user._id },
    {
      "validateKey.validateEmail.verifyMailToken": token,
      "validateKey.validateEmail.emailVerified": false,
    }
  );
  await self.sendverifyToken(user.email, token);

  return true;
};

self.sendValidateEmail = async (email) => {
  let user = await User.findOne({ email: email }, { name: 1, email: 1 });

  let file = fs.readFileSync(process.env.TEMPLATE_WELCOME, "utf8");
  file = file.replace("+++user+++", user.name);

  return await ses.sendCustom(
    user.email,
    file,
    "Bienvenido a " + process.env.PROJECT_NAME
  );
};

self.verifyMailTokenAccount = async (req, res) => {
  let token = req.params.token;
  const data = jwt.verify(token, process.env.AUTH_SECRET);

  let user = await User.findOne({
    _id: data._id,
    "validateKey.validateEmail.verifyMailToken": token,
  });

  if (!user) {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Verifica que el usuario exista",
      error: new Error(),
    };
  } else {
    user.validateKey.validateEmail.verifyMailToken = null;
    user.validateKey.validateEmail.emailVerified = true;
    await user.save();
  }

  if (user.validateKey.validateEmail.emailVerified === true) {
    await self.sendValidateEmail(user.email);
  }

  const newToken = await user.generateAuthToken();

  return { token: newToken };
};

self.updatePicture = async (req, res) => {
  let user = await User.findOne({ _id: req.user._id });
  if (!user) {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Verifica que el usuario exista",
      error: new Error(),
    };
  }

  const url = await s3.upload("user/urlImg-" + user._id, req.files.urlImg);
  await User.updateOne(
    { _id: user._id },
    { urlImg: url, lastUpdate: new Date().getTime() }
  );
  const result = await User.findOne({ _id: user._id });

  return result;
};

self.verifyPhone = async (req, res) => {
  const user = await User.findOne({ phone: req.user.phone });
  if (!user) {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Verifica que el usuario exista",
      error: new Error(),
    };
  }

  const code = await self.generatecode();
  const Message =
    "Tu código de " +
    process.env.PROJECT_NAME +
    " es: " +
    code +
    ". No lo compartas con nadie. " +
    process.env.PROJECT_URL;
  await User.updateOne(
    { _id: user._id },
    {
      "validateKey.validatePhone.codeVerifyPhone": code,
      "validateKey.validatePhone.validCodePhone": false,
    }
  );
  await sns.sendMessagePhone(req.user.phone, Message);

  user.validateKey.validatePhone.codeVerifyPhone = code;
  let time = new Date();
  const sumarMinutos = new Date(time.getTime() + 10 * 60000);
  user.limitCodeTime = new Date(sumarMinutos).getTime();
  await user.save();

  return true;
};

self.validatePhone = async (req, res) => {
  let body = JSON.parse(JSON.stringify(req.body));
  const user = await User.findOne({ phone: req.user.phone });
  const newTime = new Date().getTime();

  if (!user) {
    throw {
      code: 409,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "Verifica que el usuario exista",
      error: new Error(),
    };
  }

  if (user.limitCodeTime < newTime) {
    throw {
      code: 409,
      title: "El código ha caducado.",
      detail: "",
      suggestion: "Verifica que el código sea correcto",
      error: new Error(),
    };
  }

  if (user.validateKey.validatePhone.codeVerifyPhone == body.codeVerifyPhone) {
    user.validateKey.validatePhone.codeVerifyPhone = null;
    user.limitCodeTime = null;
    user.validateKey.validatePhone.validCodePhone = true;

    await user.save();
  } else {
    throw {
      code: 409,
      title: "Código incorrecto.",
      detail: "",
      suggestion: "Verifica el código",
      error: new Error(),
    };
  }

  return "Teléfono Verificado";
};

self.createCustomer = async (req, res) => {
  let user;
  user = await User.findOne({ email: req.body.email }).lean();
  if (user) {
    throw {
      code: 404,
      title: "Upss!",
      detail: "",
      suggestion: "El correo ya se encuentra resgitrado",
      error: new Error(),
    };
  }
  user = new User(req.body);
  user.createdAt = new Date().getTime();
  user.status = req.body?.status ? req.body?.status : "Activo";
  let fun;
  if (req.body?.assignedRole) {
    fun = await Function.findOne(
      { _id: req.body?.assignedRole },
      { name: 1 }
    ).lean();
    if (fun?.name === "Propietario") {
      throw {
        code: 400,
        title: "Upss!",
        detail: "Error al registrar",
        suggestion: "Intentalo más tarde",
        error: new Error(),
      };
    }
  } else {
    fun = await Function.findOne(
      { name: process.env.FUNCTION_NAME },
      { name: 1 }
    ).lean();
  }
  user._functions.push(fun._id);
  delete user.pwd;
  user.data.changePwd = false;
  let newCustomer = await user.save();
  await UserProvisional.deleteOne({ email: newCustomer.email });
  const token = await newCustomer.generateAuthToken();
  if (process.env.UPLOAD_CUSTOMER === "true") {
    let date = await bigQuery.factoryDateTime(newCustomer?.createdAt);
    let row = {
      id: newCustomer._id.toString() || "NA",
      name: newCustomer?.name || "NA",
      email: newCustomer?.email || "NA",
      age: newCustomer?.data?.age?.toString() || "NA",
      gender: newCustomer?.data?.gender || "NA",
      scholarship: newCustomer?.data?.scholarship || "NA",
      entity: newCustomer?.data?.Entity || "NA",
      municipality: newCustomer?.data?.municipality || "NA",
      createdAt: date,
    };
    await bigQuery.callAppendRows([row], process.env.UPLOAD_CUSTOMER_TABLE);
  }
  return token;
};

self.mailChange = async (newEmail, user) => {
  const code = await self.generatecode();

  let time = new Date();
  const sumarMinutos = new Date(time.getTime() + 5 * 60000);
  await User.updateOne(
    {
      _id: user._id,
    },
    {
      "validateKey.resetPassword.resetCode": code,
      "validateKey.limitCodeTime": new Date(sumarMinutos).getTime(),
    }
  );
  let file = fs.readFileSync(process.env.TEMPLATE_CHANGE_MAIL, "utf8");
  file = file.replace("+++user+++", user.name);
  file = file.replace("+++code+++", code);
  await ses.sendCustom(newEmail, file, "Código para cambio de correo");

  return true;
};

self.validateCode = async (req, res) => {
  const newTime = new Date().getTime();
  if (req.user.validateKey.limitCodeTime < newTime) {
    throw {
      code: 409,
      title: "El código ha caducado.",
      detail: "",
      suggestion: "Vuelve a intentarlo",
      error: new Error(),
    };
  }
  const userFind = await User.findOne(
    { email: req.body.email },
    { _id: 1 }
  ).lean();

  if (userFind) {
    throw {
      code: 409,
      title: "Ya existe un usuario con ese correo",
      detail: "",
      suggestion: "Prueba con otro correo",
      error: new Error(),
    };
  }

  if (req.body.code === req.user.validateKey.resetPassword.resetCode) {
    await User.updateOne(
      {
        _id: req.user._id,
      },
      {
        "validateKey.resetPassword.validCode": true,
        "validateKey.validateEmail.emailVerified": true,
        email: req.body.email,
      }
    );
    return true;
  } else {
    throw {
      code: 409,
      title: "Código incorrecto.",
      detail: "",
      suggestion: "El código no coincide verifica el valor",
      error: new Error(),
    };
  }
};
