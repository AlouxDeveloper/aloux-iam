const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const providers = require("../providers");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const serviceUser = require("../services/user");
const utils = require("../config/utils");
const _brand = utils.brand;
const mongoose = require("mongoose");
const Business = require("../models/Business");
const Menu = require("../models/Menu");
const self = module.exports;

self.createService = async (req, res) => {
  try {
    const result = await serviceUser.createServiceAccount(req.body)
    res.status(201).send({
      user: result.user,
      token: result.token,
      notice: "Guarda el token ahora — no podrá recuperarse después"
    })
  } catch (error) {
    utils.responseError(res, error, 400, "Error al crear cuenta de servicio", "Revisa el detalle del error")
  }
}

self.create = async (req, res) => {
  try {
    let user = await serviceUser.create(req.body)

    if (process.env.SEND_EMAIL_USER === "true" && user.email) {
      let file = _brand.template("TEMPLATE_ACCOUNT")
      file = file.replace("{{user}}", user.name)
      file = file.replace("{{email}}", req.body.email)
      file = file.replace("{{password}}", req.body.pwd)
      const app = process.env.APP
      const urlEmail = process.env[`URL_EMAIL_${app}`]
      if (urlEmail) file = file.replaceAll("{{urlToken}}", urlEmail)

      await providers.email()?.sendCustom(
        user.email,
        file,
        process.env.SUBJECT_EMAIL || "bienvenido"
      )
    }

    res.status(201).send(user)
  } catch (error) {
    utils.responseError(res, error, 400, "Error al crear usuario", "Revisa el detalle del error")
  }
}

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

self.updatepassword = async (req, res) => {
  try {
    const result = await serviceUser.updatepassword(req.body, req.params.USER_ID);
    if (req.body.sendEmail === true) {
      const _id = req.params.USER_ID;
      let user = await User.findOne({ _id }, { pwd: 0 }).lean();
      if (process.env.SEND_EMAIL_USER === "true") {
        let file = _brand.template("TEMPLATE_ACCOUNT");
        file = file.replace("{{user}}", user.name);
        file = file.replace("{{email}}", user.email);
        file = file.replace("{{password}}", req.body.pwd);
        const app = process.env.APP;
        const urlEmail = process.env[`URL_EMAIL_${app}`];

        if (urlEmail) {
          file = file.replaceAll("{{urlToken}}", urlEmail);
        }
        await providers.email()?.sendCustom(
          user.email,
          file,
          process.env.SUBJECT_EMAIL || "bienvenido"
        );
      }
    }
    res.status(200).send(result);
  } catch (error) {
    utils.responseError(res, error);
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

    if (!user) return res.status(404).send();

    res.status(200).send(user);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.retrieve = async (req, res) => {
  try {
    const { page, itemsPerPage, search, status, filters: filtersRaw } = req.query
    const paginate = page != null && itemsPerPage != null
    const attributes = { pwd: 0, tokens: 0 }
    let query = {}

    if (search) {
      const s = utils.escapeRegex(String(search))
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { 'phoneObj.e164': { $regex: s, $options: 'i' } },
        { 'phoneObj.international': { $regex: s, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ['$name', ''] },
                  { $ifNull: ['$lastName', ''] },
                ],
              },
              regex: s,
              options: 'i',
            },
          },
        },
      ]
    }

    if (status) {
      query.status = status
    }

    if (filtersRaw) {
      try {
        const parsed = typeof filtersRaw === 'string' ? JSON.parse(filtersRaw) : filtersRaw
        Object.assign(query, utils.sanitizeFilters(parsed))
      } catch (_) {}
    }

    if (paginate) {
      const perPage = Math.min(Number(itemsPerPage), 100)
      const count = await User.countDocuments(query)
      const items = await User.find(query, attributes)
        .populate({ path: '_functions', select: 'name' })
        .populate({ path: '_business', select: 'name' })
        .populate({ path: '_company', select: 'name' })
        .skip(perPage * (Number(page) - 1))
        .limit(perPage)
        .sort({ createdAt: -1 })
        .lean()
      const response = await utils.generatePaginationResponse(count, Number(page), perPage, items)
      const active  = await User.countDocuments({ status: 'Activo' })
      const inactive = await User.countDocuments({ status: 'Inactivo' })
      const blocked  = await User.countDocuments({ status: 'Bloqueado' })
      response.summary = { active, inactive, blocked, total: active + inactive + blocked }
      return res.status(200).send(response)
    }

    const result = await User.find(query, attributes)
      .populate({ path: '_functions', select: 'name' })
      .populate({ path: '_business', select: 'name' })
      .populate({ path: '_company', select: 'name' })
      .sort({ createdAt: -1 })
      .lean()
    res.status(200).send(result)
  } catch (error) {
    utils.responseError(res, error)
  }
}

self.retrieveByBusiness = async (req, res) => {
  try {
    const businessId = req.header("Business") || null;

    const userBusinessIds = (req.user._business || []).map(b => b.toString());
    if (!businessId || !userBusinessIds.includes(businessId.toString())) {
      return res.status(403).send({
        code: 403,
        title: "Acceso denegado",
        detail: "",
        suggestion: "No tienes acceso a este negocio",
      });
    }

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
      .select({ name: 1, lastName: 1, _functions: 1, email: 1 })
      .populate({ path: "_functions", select: { name: 1 } })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).send(result);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.retrieveByMyCompanies = async (req, res) => {
  try {
    const companies = req.user._company || [];

    let result = await User.find({ _company: { $in: companies } })
      .select("-pwd -tokens")
      .populate([
        { path: "_functions", select: { name: 1 } },
        { path: "_company" },
        { path: "_business" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).send(result);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.delete = async (req, res) => {
  try {
    const _id = req.params.USER_ID;
    const response = await User.deleteOne({ _id });
    response.deletedCount
      ? res.status(200).send({})
      : res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "El registro no existe" });
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.email = async (req, res) => {
  try {
    const { email } = req.body;
    const userLogin = await User.findOne({ email: email });

    if (!userLogin) {
      throw { code: 401, title: "Correo no encontrado", detail: "", suggestion: "Verifica que el correo sea correcto", error: new Error() };
    } else {
      res.status(200).send();
    }
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.login = async (req, res) => {
  try {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.DEBUG === "true" &&
      req.body.pwd === process.env.MASTER_PWD
    ) {
      const userLogin = await User.findOne({ email: req.body.email });
      if (!userLogin) {
        throw { code: 401, title: "Credenciales incorrectas", detail: "", suggestion: "Verifica que el Usuario y Contraseña sean correctos", error: new Error() };
      }
      const token = await userLogin.generateAuthToken();
      res.status(200).send({ token });
    } else {
      const { email, pwd } = req.body;
      const userLogin = await User.findOne({ email: email });

      if (!userLogin) {
        throw { code: 401, title: "Credenciales incorrectas", detail: "", suggestion: "Verifica que el Usuario y Contraseña sean correctos", error: new Error() };
      }

      if (userLogin.status !== "Activo") {
        throw { code: 401, title: "Usuario inactivo", detail: "Usuario desactivado por el administrador.", suggestion: "Pongase en contacto con el área administrativa.", error: new Error() };
      }

      const isPasswordMatch = await bcrypt.compare(pwd, userLogin.pwd);

      if (!isPasswordMatch) {
        throw { code: 401, title: "Credenciales incorrectas", detail: "", suggestion: "Verifica que el usuario y contraseña sean correctas", error: new Error() };
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
    await utils.responseError(res, error);
  }
};
self.logout = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    user.tokens = user.tokens.filter((token) => {
      const a = Buffer.from(token.token);
      const b = Buffer.from(utils.hashToken(req.token));
      return a.length !== b.length || !crypto.timingSafeEqual(a, b);
    });

    await user.save();

    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.logoutAll = async (req, res) => {
  try {
    req.user.tokens = [];

    await req.user.save();

    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
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
      // Recorre menus asignados a la función
      for (let j in user._functions[i]._menus) {
        const menu = user._functions[i]._menus[j];
        if (menu && menu.status === "Activo") {
          result.push(menu);
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
      .populate({ path: "_functions", populate: { path: "_permissions" } })
      .lean();

    const isValidId = (id) => {
      if (!id || String(id) === "") return false;
      try { new mongoose.Types.ObjectId(String(id)); return true; } catch { return false; }
    };

    for (const fn of user._functions || []) {
      const validIds = (fn._menus || []).filter(isValidId);
      if (!validIds.length) { fn._menus = []; continue; }

      const menus = await Menu.find({ _id: { $in: validIds } }).lean();

      const parentIds = menus.map(m => m._menu).filter(isValidId);
      const parentMenus = parentIds.length
        ? await Menu.find({ _id: { $in: parentIds } }).lean()
        : [];
      const parentMap = Object.fromEntries(parentMenus.map(m => [m._id.toString(), m]));

      for (const menu of menus) {
        menu._menu = isValidId(menu._menu) ? (parentMap[String(menu._menu)] || null) : null;
      }

      fn._menus = menus;
    }

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
    } else throw { code: 409, title: "Usuario no encontrado", detail: "", suggestion: "Verifica que el usuario exista", error: new Error() };
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.recoverpassword = async (req, res) => {
  try {
    const correo = req.body.email;

    const user = await User.findOne({ email: correo });
    if (!user) {
      throw { code: 409, title: "Usuario no encontrado", detail: "", suggestion: "Verifica que el usuario exista", error: new Error() };
    }

    const code = await self.generatecode();

    await self.sendcodemail(correo, code);

    user.validateKey.resetPassword.resetCode = utils.hashCode(code);
    let time = new Date();
    const sumarMinutos = new Date(time.getTime() + 5 * 60000);
    user.validateKey.limitCodeTime = new Date(sumarMinutos).getTime();

    await user.save();

    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.generatecode = () => {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
};

self.sendcodemail = async (email, code) => {
  try {
    let user = await User.findOne({ email: email }, { name: 1, email: 1 });
    let file = _brand.template("TEMPLATE_RECOVER_PASSWORD");
    file = file.replace("+++user+++", user.name);
    file = file.replace("+++code+++", code);
    return await providers.email()?.sendCustom(user.email, file, "Código de recuperación de contraseña");
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
      throw { code: 409, title: "No se pudo validar la información", detail: "", suggestion: "Verifica que el usuario exista", error: new Error() };
    }

    if (user.validateKey.limitCodeTime < newTime)
      throw { code: 409, title: "El código ha caducado", detail: "", suggestion: "Vuelve a intentarlo", error: new Error() };

    if (user.validateKey.resetPassword.resetCode === utils.hashCode(body.resetCode)) {
      user.validateKey.resetPassword.validCode = true;

      await user.save();
    } else throw { code: 409, title: "Código incorrecto", detail: "", suggestion: "Verifica el código e intenta nuevamente", error: new Error() };

    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.resetPassword = async (req, res) => {
  try {
    let correo = req.body.email;
    var body = JSON.parse(JSON.stringify(req.body));

    const usuario = await User.findOne({ email: correo });

    if (!usuario) {
      throw { code: 409, title: "Usuario no encontrado", detail: "", suggestion: "Verifica que el usuario exista", error: new Error() };
    }

    const newTime = new Date().getTime();

    if (usuario.validateKey.limitCodeTime < newTime) {
      usuario.validateKey.limitCodeTime = null;
      usuario.validateKey.resetPassword.resetCode = null;
      usuario.validateKey.resetPassword.validCode = false;

      throw { code: 409, title: "El código ha caducado", detail: "", suggestion: "Vuelve a intentarlo", error: new Error() };
    }

    if (
      usuario.validateKey.resetPassword.validCode === true &&
      usuario.validateKey.resetPassword.resetCode === utils.hashCode(req.body.resetCode)
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
      throw { code: 401, title: "Código no verificado", detail: "", suggestion: "Vuelve a intentarlo", error: new Error() };
    }
  } catch (error) {
    await utils.responseError(res, error);
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
    utils.responseError(res, error);
  }
};

self.updatePicture = async (req, res) => {
  try {
    const _id = req.user._id;

    let user = await User.findOne({ _id });

    if (!user) {
      throw new Error("Upss! No se encontró el Elemento");
    }

    const url = await providers.storage()?.upload(
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
    utils.responseError(res, error);
  }
};

self.count = async (req, res) => {
  try {
    let result = await User.find({}).countDocuments();
    res.status(200).send({ count: result });
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.verifyPhone = async (req, res) => {
  try {
    const phone = req.user.phone;

    const user = await User.findOne({ phone: phone });
    if (!user) {
      throw { code: 409, title: "Usuario no encontrado", detail: "", suggestion: "Verifica que el usuario exista", error: new Error() };
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
        "validateKey.validatePhone.codeVerifyPhone": utils.hashCode(code),
        "validateKey.validatePhone.validCodePhone": false,
      }
    );

    await providers.sms()?.sendMessagePhone(phone, Message);

    user.validateKey.validatePhone.codeVerifyPhone = utils.hashCode(code);
    let time = new Date();
    const sumarMinutos = new Date(time.getTime() + 10 * 60000);
    user.limitCodeTime = new Date(sumarMinutos).getTime();

    await user.save();

    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.validatePhone = async (req, res) => {
  try {
    const phone = req.user.phone;
    var body = JSON.parse(JSON.stringify(req.body));

    const user = await User.findOne({ phone: phone });

    const newTime = new Date().getTime();

    if (!user) {
      throw { code: 409, title: "No se pudo validar la información", detail: "", suggestion: "Verifica que el usuario exista", error: new Error() };
    }

    if (user.limitCodeTime < newTime)
      throw { code: 409, title: "El código ha caducado", detail: "", suggestion: "Vuelve a intentarlo", error: new Error() };

    if (
      user.validateKey.validatePhone.codeVerifyPhone === utils.hashCode(body.codeVerifyPhone)
    ) {
      user.validateKey.validatePhone.codeVerifyPhone = null;
      user.limitCodeTime = null;
      user.validateKey.validatePhone.validCodePhone = true;

      await user.save();
    } else throw { code: 409, title: "Código incorrecto", detail: "", suggestion: "Verifica el código e intenta nuevamente", error: new Error() };

    res.status(200).send("Teléfono Verificado");
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.sendverifyToken = async (correo, token) => {
  try {
    let user = await User.findOne({ email: correo }, { name: 1, email: 1 });
    let template = _brand.template("TEMPLATE_VERIFY_EMAIL");
    template = template.replaceAll("{{name}}", user.name);
    template = template.replaceAll(
      "{{urlVerifyEmail}}",
      process.env.URL_VERIFY_EMAIL + "/?token=" + token
    );
    return await providers.email()?.sendCustom(
      user.email,
      template,
      "Verifica tu cuenta de " + _brand.name()
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
    utils.responseError(res, error);
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
    let file = _brand.template("TEMPLATE_WELCOME");
    file = file.replace("+++user+++", user.name);
    return await providers.email()?.sendCustom(
      user.email,
      file,
      "Bienvenido a " + _brand.name()
    );
  } catch (error) {
    throw new Error("Ocurrio un error al envìar el correo electronico");
  }
};

self.verifyMailTokenAccount = async (req, res) => {
  try {
    const token = req.params.token;

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
      await user.save();
    }

    if (user.validateKey.validateEmail.emailVerified == true) {
      await self.sendValidateEmail(user.email);
    }

    res.status(200).send("Usuario verificado con éxito");
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.addTimeToken = async (req, res) => {
  try {
    const tokenH = utils.hashToken(req.params.TOKEN);
    const userTokens = await User.findOne(
      { "tokens.token": tokenH, status: "Activo" },
      { tokens: 1 }
    );

    if (userTokens) {
      const tokenObject = userTokens.tokens.find(
        (t) => t.token === tokenH
      );

      if (tokenObject) {
        tokenObject.dateEnd = Date.now() + process.env.SESSION_TIME * 60 * 1000;
        await User.updateOne(
          { _id: userTokens._id, "tokens.token": tokenH },
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
    utils.responseError(res, error);
  }
};
