const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const User = require("../models/User");

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

  return { message: "TOTP configurado correctamente" };
};

// valida código en login y emite token real
self.checkLogin = async (token, tempToken, res) => {
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

  const authToken = await user.generateAuthToken();

  res.cookie("token", authToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    expires: dayjs().add(30, "days").toDate(),
  });

  return { token: authToken, changePwd: user.data.changePwd };
};

// admin habilita o deshabilita 2FA de un usuario
self.adminToggle = async (userId, enabled) => {
  const user = await User.findOne({ _id: userId });

  if (!user)
    throw {
      code: 404,
      title: "Usuario no encontrado.",
      detail: "",
      suggestion: "",
      error: new Error(),
    };

  const update = enabled
    ? { "data.totp.enabled": true }
    : { "data.totp.enabled": false, "data.totp.secret": null };

  await User.updateOne({ _id: user._id }, { $set: update });

  return { message: enabled ? "2FA habilitado" : "2FA deshabilitado" };
};
