const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authCookie = require("../config/authCookie");
const privilegeGuard = require("../config/privilegeGuard");

authenticator.options = { window: 1 };

const self = module.exports;

// Helper

const verifyTotpToken = (secret, token) =>
  authenticator.verify({ token, secret });

const verifyTempToken = (tempToken) => {
  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.AUTH_SECRET);
    if (payload.type !== "totp_pending") throw new Error();
  } catch {
    throw {
      code: 401,
      title: "Sesión expirada.",
      detail: "",
      suggestion: "Vuelve a iniciar sesión",
      error: new Error(),
    };
  }
  return payload;
};

// genera QR y guarda el secreto
self.setup = async (tempToken) => {
  const payload = verifyTempToken(tempToken);

  const user = await User.findOne({ _id: payload._id });

  if (!user)
    throw {
      code: 404,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "",
      error: new Error(),
    };

  if (!user?.data?.totp?.enabled)
    throw {
      code: 403,
      title: "2FA no habilitado.",
      detail: "",
      suggestion: "Contacta al administrador para habilitarlo",
      error: new Error(),
    };

  // Un secreto ya configurado NO se reemplaza: antes, quien tuviera la contraseña podía pedir un QR nuevo con el
  // tempToken del login, registrarlo en su propio autenticador y saltarse el 2FA por completo (además de dejar
  // fuera al dueño de la cuenta). Para reconfigurarlo, un administrador apaga y enciende el 2FA (adminToggle).
  if (user?.data?.totp?.secret)
    throw {
      code: 409,
      title: "2FA ya configurado.",
      detail: "Esta cuenta ya tiene un autenticador registrado",
      suggestion: "Si perdiste el acceso, pide a un administrador que reinicie tu 2FA",
      error: new Error(),
    };

  const secretBase32 = authenticator.generateSecret(20);
  const keyUri = authenticator.keyuri(
    user.email,
    process.env.PROJECT_NAME,
    secretBase32,
  );
  const qrCode = await QRCode.toDataURL(keyUri);

  await User.updateOne(
    { _id: user._id },
    { $set: { "data.totp.secret": secretBase32 } },
  );

  return { secret: secretBase32, qrCode };
};

// valida el código tras escanear el QR
self.activate = async (tempToken, token) => {
  const payload = verifyTempToken(tempToken);

  const user = await User.findOne({ _id: payload._id });

  if (!user?.data?.totp?.secret)
    throw {
      code: 400,
      title: "QR no generado.",
      detail: "",
      suggestion: "Primero genera el QR desde /totp/setup",
      error: new Error(),
    };

  if (!verifyTotpToken(user.data.totp.secret, token))
    throw {
      code: 400,
      title: "Código inválido.",
      detail: "",
      suggestion:
        "El código ingresado es incorrecto, verifica que sea el correcto e intenta de nuevo.",
      error: new Error(),
    };

  // Deja constancia de la activación: antes solo validaba y no guardaba nada
  await User.updateOne({ _id: user._id }, { $set: { "data.totp.activatedAt": Date.now() } });

  return { message: "TOTP configurado correctamente" };
};

// valida código en login y emite token real
self.checkLogin = async (token, tempToken, res, userAgent) => {
  const payload = verifyTempToken(tempToken);

  const user = await User.findOne({ _id: payload._id });

  if (!user?.data?.totp?.enabled)
    throw {
      code: 400,
      title: "2FA no está configurado.",
      detail: "",
      suggestion: "",
      error: new Error(),
    };

  if (!user?.data?.totp?.secret)
    throw {
      code: 400,
      title: "TOTP no configurado.",
      detail: "",
      suggestion: "Configura tu app Authenticator primero",
      error: new Error(),
    };

  if (!verifyTotpToken(user.data.totp.secret, token))
    throw {
      code: 401,
      title: "Código inválido o expirado.",
      detail: "",
      suggestion:
        "El código ingresado es incorrecto, verifica que sea el correcto e intenta de nuevo.",
      error: new Error(),
    };

  user.data.changePwd = user?.data?.changePwd ?? false;
  user.validateKey.failedAttempts = 0;
  await user.save();

  const authToken = await user.generateAuthToken(userAgent);

  return authCookie.body(res, authToken, { changePwd: user.data.changePwd });
};

// admin habilita o deshabilita 2FA de un usuario
// req se usa para validar que el administrador pueda tocar a ese usuario (apagar el 2FA ajeno era libre)
self.adminToggle = async (userId, enabled, req) => {
  const user = await User.findOne({ _id: userId });

  if (!user)
    throw {
      code: 404,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "",
      error: new Error(),
    };

  if (req) await privilegeGuard.assertCanManage(req, user.toObject ? user.toObject() : user);

  const update = enabled
    ? { "data.totp.enabled": true }
    : { "data.totp.enabled": false, "data.totp.secret": null, "data.totp.activatedAt": null };

  await User.updateOne({ _id: user._id }, { $set: update });

  return { message: enabled ? "2FA habilitado" : "2FA deshabilitado" };
};
