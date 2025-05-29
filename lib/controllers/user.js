const User = require("../models/User");
const bcrypt = require("bcryptjs");
const alouxAWS = require("./operationsAWS");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const serviceUser = require("../services/user");
const utils = require("../config/utils");
const mongoose = require("mongoose");
const AWS_SES = require("../services/ses");
const Business = require("../models/Business");
const self = module.exports;

self.create = async (req, res) => {
  // Create a new user
  try {
    let user = await serviceUser.create(req.body);
    //  Send email to user
    if (process.env.SEND_EMAIL_USER === "true") {
      let file = fs.readFileSync(process.env.TEMPLATE_ACCOUNT, "utf8");
      file = file.replace("{{user}}", user.name);
      file = file.replace("{{email}}", req.body.email);
      file = file.replace("{{password}}", req.body.pwd);
      if (process.env.URL_EMAIL) {
        file = file.replace("{{urlToken}}", process.env.URL_EMAIL);
      }
      await AWS_SES.sendCustom(
        user.email,
        file,
        process.env.SUBJECT_EMAIL || "bienvenido"
      );
    }

    res.status(201).send(user);
  } catch (error) {
    utils.responseError(
      res,
      error,
      400,
      "Error al crear usuario",
      "Revisa el detalle del error"
    );
  }
};

self.update = async (req, resp) => {
  try {
    let result = await serviceUser.update(req.params.USER_ID, req.body);

    resp.status(200).send(result);
  } catch (error) {
    utils.responseError(
      resp,
      error,
      400,
      "Error al actualizar usuario",
      "Revisa el detalle del error"
    );
  }
};

self.status = async (req, resp) => {
  try {
    const result = await serviceUser.status(req.params.USER_ID, req.body);

    resp.status(200).send(result);
  } catch (error) {
    utils.responseError(
      resp,
      error,
      400,
      "Error al actualizar usuario",
      "Revisa el detalle del error"
    );
  }
};

self.updatepassword = async (req, resp) => {
  try {
    const result = await serviceUser.updatepassword(
      req.body,
      req.params.USER_ID
    );

    resp.status(200).send(result);
  } catch (error) {
    resp.status(400).send({ error: error.message });
  }
};

self.get = async (req, res) => {
  try {
    const _id = req.params.USER_ID;
    let user = {};

    // Valida que los modelos existan hantes de hacer una consulta con populate
    if (
      mongoose.modelNames().includes("Business") &&
      mongoose.modelNames().includes("Client")
    ) {
      user = await User.findOne({ _id }, { pwd: 0 })
        .populate([
          { path: "_functions" },
          { path: "_business" },
          { path: "_client" },
        ])
        .select("-pwd")
        .lean();
    } else if (mongoose.modelNames().includes("Business")) {
      user = await User.findOne({ _id }, { pwd: 0 })
        .populate([{ path: "_functions" }, { path: "_business" }])
        .select("-pwd")
        .lean();
    } else if (mongoose.modelNames().includes("Client")) {
      user = await User.findOne({ _id }, { pwd: 0 })
        .populate([{ path: "_functions" }, { path: "_client" }])
        .select("-pwd")
        .lean();
    } else {
      user = await User.findOne({ _id }, { pwd: 0 })
        .populate([{ path: "_functions" }])
        .select("-pwd")
        .lean();
    }

    if (!user) res.status(404).send();

    res.status(200).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
};

self.retrieve = async (req, res) => {
  try {
    let result = await User.find({})
      .select("-pwd -tokens")
      .populate([
        { path: "_functions" },
        { path: "_company" },
        { path: "_business" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.retrieveByBusiness = async (req, res) => {
  try {
    const businessId = req.header("Business") || null;
    const business = await Business.findOne({ _id: businessId }).lean();

    if (!business) {
      throw {
        code: 401,
        title: "El negocio no existe",
        detail: "",
        suggestion: "No se encontro el negocio",
        error: new Error(),
      };
    }

    let result = await User.find({ _business: business._id })
      .select("-pwd -tokens")
      .populate({ path: "_functions", select: { name: 1 } })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.delete = async (req, res) => {
  try {
    const _id = req.params.USER_ID;
    const response = await User.deleteOne({ _id });
    response.deletedCount
      ? res.status(200).send({})
      : res.status(404).send({ error: "El registro no existe" });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.email = async (req, res) => {
  try {
    const { email } = req.body;
    const userLogin = await User.findOne({ email: email });

    if (!userLogin) {
      return res.status(401).send({
        error: "No se encontró el correo",
        suggestion: "Verifica que el correo sea correcto",
      });
    } else {
      res.status(200).send();
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

self.login = async (req, res) => {
  try {
    if (
      process.env.DEBUG === "true" &&
      req.body.pwd === process.env.MASTER_PWD
    ) {
      const userLogin = await User.findOne({ email: req.body.email });
      if (!userLogin) {
        return res.status(401).send({
          title: "Credenciales incorrectas",
          suggestion: "Verifica que el Usuario y Contraseña sean correctos",
        });
      }
      const token = await userLogin.generateAuthToken();
      res.status(200).send({ token });
    } else {
      const { email, pwd } = req.body;
      const userLogin = await User.findOne({ email: email });

      if (!userLogin) {
        return res.status(401).send({
          title: "Credenciales incorrectas",
          suggestion: "Verifica que el Usuario y Contraseña sean correctos",
        });
      }

      if (userLogin.status !== "Activo") {
        return res.status(401).send({
          title: "Usuario inactivo",
          detail: "Usuario desactivado por el administrador.",
          suggestion: "Pongase en contacto con el área administrativa.",
        });
      }

      const isPasswordMatch = await bcrypt.compare(pwd, userLogin.pwd);

      if (!isPasswordMatch) {
        return res.status(401).send({
          title: "Credenciales incorrectas",
          suggestion: "Verifica que el usuario y contraseña sean correctas",
        });
      } else {
        const token = await userLogin.generateAuthToken();

        res.cookie("token", token, {
          secure: true,
          httpOnly: true,
          sameSite: "none",
          expires: dayjs().add(30, "days").toDate(),
        });

        res.status(200).send({ token });
      }
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};
self.logout = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    user.tokens = user.tokens.filter((token) => {
      return token.token != req.token;
    });

    await user.save();

    res.status(200).send();
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

self.logoutAll = async (req, res) => {
  try {
    req.user.tokens = [];

    await req.user.save();

    res.status(200).send();
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

self.getPermission = (user) => {
  let result = {};
  for (let i in user._functions) {
    for (let j in user._functions[i]._permissions) {
      if (user._functions[i]._permissions[j].status === "Activo")
        result[user._functions[i]._permissions[j].api] = true;
    }
  }
  return result;
};

self.getMenu = (user) => {
  let result = [];
  // Recorre funciones de un user
  for (let i in user._functions) {
    if (user._functions[i].status === "Activo") {
      // Recorre permisos de una función && Valida si el menú esta activo
      for (let j in user._functions[i]._permissions) {
        const permission = user._functions[i]._permissions[j];
        if (
          permission.status === "Activo" &&
          permission._menu &&
          permission._menu.status === "Activo"
        ) {
          const menu = user._functions[i]._permissions[j]._menu;
          result.push(menu);

          // Obtiene el menú padre
          if (menu._menu && menu._menu.status === "Activo") {
            result.push(menu._menu);
          }
        }
      }
    }
  }

  // Quitar repetidos
  let hash = {};
  let result2 = result.filter((o) =>
    hash[o._id] ? false : (hash[o._id] = true)
  );

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

  // Separación de menus y submenus
  let menus = [];
  let submenus = [];
  for (let i in result2) {
    if (!result2[i]._menu) {
      result2[i]._menu = [];
      menus.push(result2[i]);
    } else {
      let submenuClone = JSON.parse(JSON.stringify(result2[i]));
      delete submenuClone._menu;
      submenus.push(JSON.parse(JSON.stringify(result2[i])));
    }
  }

  // Asignación de submenus a menus
  for (let i in submenus) {
    for (let j in menus) {
      if (String(submenus[i]._menu._id) === String(menus[j]._id)) {
        menus[j]._menu.push(submenus[i]);
      }
    }
  }

  return menus;
};

self.getMe = async (req, res) => {
  try {
    let user = await User.findOne({ _id: req.user._id }, { tokens: 0, pwd: 0 })
      .populate({
        path: "_functions",
        populate: [
          {
            path: "_permissions",
            populate: [
              {
                path: "_menu",
                populate: [
                  {
                    path: "_menu",
                  },
                ],
              },
            ],
          },
        ],
      })
      .lean();

    // Obtener menús y funciones sin repertir y activas
    user.menus = self.getMenu(user);
    user.permissions = self.getPermission(user);
    for (let i in user._functions) {
      user._functions[i]._permissions = null;
    }

    return user;
  } catch (error) {
    throw new Error(error);
  }
};

self.me = async (req, res) => {
  try {
    res.status(200).send(await self.getMe(req, res));
  } catch (error) {
    let obj = error;
    if (!error.code) {
      obj = {
        code: 401,
        title: "Error de autenticación",
        detail: error.message,
        suggestion: "Vuelve a iniciar sesion",
      };
    }

    res.cookie("user", obj, {
      secure: true,
      httpOnly: true,
      expires: dayjs().add(30, "days").toDate(),
    });

    res.status(obj.code).send(obj);
  }
};

self.resetPass = async (req, res) => {
  try {
    let _id = req.user._id;

    const usuario = await User.findOne({ _id });

    if (usuario) {
      usuario.pwd = req.body.pwd;
      usuario.lastUpdate = new Date().getTime();
      await usuario.save();

      res.status(200).send("password updated successfully");
    } else return res.status(409).send({ error: "User no encontrado." });
  } catch (error) {
    res.status(400).send(error);
  }
};

self.recoverpassword = async (req, res) => {
  try {
    const correo = req.body.email;

    const user = await User.findOne({ email: correo });
    if (!user) {
      return res.status(409).send({ error: "User no encontrado." });
    }

    const code = await self.generatecode();

    await self.sendcodemail(correo, code);

    user.validateKey.resetPassword.resetCode = code;
    let time = new Date();
    const sumarMinutos = new Date(time.getTime() + 5 * 60000);
    user.validateKey.limitCodeTime = new Date(sumarMinutos).getTime();

    await user.save();

    res.status(200).send();
  } catch (error) {
    res.status(500).send("Error al envíar el correo electronico");
    console.log(error);
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

self.sendcodemail = async (email, code) => {
  try {
    let user = await User.findOne({ email: email }, { name: 1, email: 1 });

    let file = fs.readFileSync(process.env.TEMPLATE_RECOVER_PASSWORD, "utf8");
    file = file.replace("+++user+++", user.name);
    file = file.replace("+++code+++", code);

    return await alouxAWS.sendCustom(
      user.email,
      file,
      "Código de recuperación de contraseña"
    );
  } catch (error) {
    throw new Error("Ocurrio un error al envìar el correo electronico");
  }
};

self.verifyCode = async (req, res) => {
  try {
    const correo = req.body.email;
    var body = JSON.parse(JSON.stringify(req.body));

    const user = await User.findOne({ email: correo });

    const newTime = new Date().getTime();

    if (!user) {
      return res
        .status(409)
        .send({ error: "No se pudo validar la información." });
    }

    if (user.validateKey.limitCodeTime < newTime)
      return res.status(409).send({ error: "El código ha caducado." });

    if (user.validateKey.resetPassword.resetCode == body.resetCode) {
      user.validateKey.resetPassword.validCode = true;

      await user.save();
    } else return res.status(409).send("Código incorrecto.");

    res.status(200).send();
  } catch (error) {
    res.status(400).send(error);
  }
};

self.resetPassword = async (req, res) => {
  try {
    let correo = req.body.email;
    var body = JSON.parse(JSON.stringify(req.body));

    const usuario = await User.findOne({ email: correo });

    if (!usuario) {
      return res.status(409).send({ error: "User no encontrado." });
    }

    const newTime = new Date().getTime();

    if (usuario.validateKey.limitCodeTime < newTime) {
      usuario.validateKey.limitCodeTime = null;
      usuario.validateKey.resetPassword.resetCode = null;
      usuario.validateKey.resetPassword.validCode = false;

      return res.status(409).send({ error: "El código ha caducado." });
    }

    if (
      usuario.validateKey.resetPassword.validCode == true &&
      usuario.validateKey.resetPassword.resetCode == req.body.resetCode
    ) {
      usuario.pwd = body.pwd;
      usuario.validateKey.resetPassword.validCode = false;
      usuario.validateKey.resetPassword.resetCode = null;
      usuario.validateKey.limitCodeTime = null;
      usuario.lastUpdate = new Date().getTime();
      usuario.tokens = [];

      await usuario.save();

      const token = await usuario.generateAuthToken();

      res.cookie("token", token, {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        expires: dayjs().add(30, "days").toDate(),
      });

      res.status(200).send({ token });
    } else {
      return res.status(401).send("El código no ha sido verificado");
    }
  } catch (error) {
    res.status(400).send(error);
  }
};

self.updateAny = async (req, res) => {
  try {
    const _id = req.user._id;
    const update = await User.updateOne(
      { _id },
      { $set: req.body, lastUpdate: new Date().getTime() }
    );

    res.status(202).send(update);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.updatePicture = async (req, res) => {
  try {
    const _id = req.user._id;

    let user = await User.findOne({ _id });

    if (!user) {
      throw new Error("Upss! No se encontró el Elemento");
    }

    const url = await alouxAWS.upload(
      "user/urlImg-" + user._id,
      req.files.urlImg
    );

    await User.updateOne(
      { _id: user._id },
      { urlImg: url, lastUpdate: new Date().getTime() }
    );

    const result = await User.findOne({ _id: user._id });

    res.status(202).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.count = async (req, res) => {
  try {
    let result = await User.find({}).countDocuments();
    res.status(200).send({ count: result });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.verifyPhone = async (req, res) => {
  try {
    const phone = req.user.phone;

    const user = await User.findOne({ phone: phone });
    if (!user) {
      return res.status(409).send({ error: "User no encontrado." });
    }

    const code = await self.generatecode();
    const Message =
      "Docket: su código de verificación es:" +
      " " +
      code +
      " " +
      "Su código vence en 10 minutos. No comparta su código. Por favor no responda a este mensaje";

    await User.updateOne(
      { _id: user._id },
      {
        "validateKey.validatePhone.codeVerifyPhone": code,
        "validateKey.validatePhone.validCodePhone": false,
      }
    );

    await alouxAWS.sendMessagePhone(phone, Message);

    user.validateKey.validatePhone.codeVerifyPhone = code;
    let time = new Date();
    const sumarMinutos = new Date(time.getTime() + 10 * 60000);
    user.limitCodeTime = new Date(sumarMinutos).getTime();

    await user.save();

    res.status(200).send();
  } catch (error) {
    res.status(500).send("Error al envíar el mensaje");
    console.log(error);
  }
};

self.validatePhone = async (req, res) => {
  try {
    const phone = req.user.phone;
    var body = JSON.parse(JSON.stringify(req.body));

    const user = await User.findOne({ phone: phone });

    const newTime = new Date().getTime();

    if (!user) {
      return res
        .status(409)
        .send({ error: "No se pudo validar la información." });
    }

    if (user.limitCodeTime < newTime)
      return res.status(409).send({ error: "El código ha caducado." });

    if (
      user.validateKey.validatePhone.codeVerifyPhone == body.codeVerifyPhone
    ) {
      user.validateKey.validatePhone.codeVerifyPhone = null;
      user.limitCodeTime = null;
      user.validateKey.validatePhone.validCodePhone = true;

      await user.save();
    } else return res.status(409).send("Código incorrecto.");

    res.status(200).send("Teléfono Verificado");
  } catch (error) {
    res.status(400).send(error);
  }
};

self.sendverifyToken = async (correo, token) => {
  try {
    let user = await User.findOne({ email: correo }, { name: 1, email: 1 });

    let template = fs.readFileSync(process.env.TEMPLATE_VERIFY_EMAIL, "utf8");
    template = template.replaceAll("{{name}}", user.name);
    template = template.replaceAll(
      "{{urlVerifyEmail}}",
      process.env.URL_VERIFY_EMAIL + "/?token=" + token
    );

    return await alouxAWS.sendCustom(
      user.email,
      template,
      "Verifica tu cuenta de " + process.env.PROJECT_NAME
    );
  } catch (error) {
    throw new Error("Ocurrio un error al envìar el correo electronico");
  }
};

self.sendVerifyMailAccount = async (req, res) => {
  try {
    const result = await self.sendVerifyMailAccountJob(req, true);

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.sendVerifyMailAccountJob = async (data, ban) => {
  // Generating recover pwd code and sending to user email address
  try {
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

    //var urlToken = process.env.VERIFY_ACCOUNT_URL + "=" + token

    return await self.sendverifyToken(user.email, token);
  } catch (error) {
    let obj = error;
    if (!error.code) {
      obj = {
        code: 400,
        title: "Error",
        detail: error.message,
        suggestion: "Revisa el detalle del error",
      };
    }
    return obj;
  }
};

self.sendValidateEmail = async (email) => {
  try {
    let user = await User.findOne({ email: email }, { name: 1, email: 1 });

    let file = fs.readFileSync(process.env.TEMPLATE_WELCOME, "utf8");
    file = file.replace("+++user+++", user.name);

    return await sesSDK.sendCustom(
      user.email,
      file,
      "Bienvenido a " + process.env.PROJECT_NAME
    );
  } catch (error) {
    throw new Error("Ocurrio un error al envìar el correo electronico");
  }
};

self.verifyMailTokenAccount = async (req, res) => {
  try {
    token = req.params.token;

    const data = jwt.verify(token, process.env.AUTH_SECRET);

    let user = await User.findOne({
      _id: data._id,
      "validateKey.validateEmail.verifyMailToken": token,
    });

    if (!user) {
      throw new Error("¡Error!, Token no valido");
    } else {
      user.validateKey.validateEmail.verifyMailToken = null;
      user.validateKey.validateEmail.emailVerified = true;
      user.save();
    }

    if (user.validateKey.validateEmail.emailVerified == true) {
      await self.sendValidateEmail(user.email);
    }

    res.status(200).send("Usuario verificado con éxito");
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.addTimeToken = async (req, res) => {
  try {
    const userTokens = await User.findOne(
      { "tokens.token": req.params.TOKEN, status: "Activo" },
      { tokens: 1 }
    );

    if (userTokens) {
      const tokenObject = userTokens.tokens.find(
        (t) => t.token === req.params.TOKEN
      );

      if (tokenObject) {
        tokenObject.dateEnd = Date.now() + process.env.SESSION_TIME * 60 * 1000;
        // Guarda los cambios en la base de datos
        await User.updateOne(
          { _id: userTokens._id, "tokens.token": req.params.TOKEN },
          { $set: { "tokens.$.dateEnd": tokenObject.dateEnd } }
        );
      } else {
        throw new Error("Token no encontrado");
      }
    } else {
      throw new Error("Usuario no encontrado o inactivo");
    }
    res.status(200).send("Usuario verificado con éxito");
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
