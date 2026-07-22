const Auth = require("../services/auth");
const utils = require("../config/utils");

const self = module.exports;

const _rateLimitStore = new Map();
const _checkRateLimit = (req, res) => {
  const maxAttempts = parseInt(process.env.FAILED_ATTEMPS) || 5;
  const windowMs = 15 * 60 * 1000;
  const key = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const record = _rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count++;
  _rateLimitStore.set(key, record);
  if (record.count > maxAttempts) {
    res.status(429).send({
      code: 429,
      title: 'Demasiados intentos',
      detail: 'Has superado el límite de intentos permitidos.',
      suggestion: 'Espera unos minutos antes de intentarlo nuevamente.'
    });
    return false;
  }
  return true;
};

self.email = async (req, res) => {
  if (!_checkRateLimit(req, res)) return;
  try {
    const response = await Auth.searchEmail(req.body.email, req.body.code);
    res.status(response.statusCode).send({
      email: response.email,
      _id: response._id,
      name: response.name,
      lastName: response.lastName,
    });
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.login = async (req, res) => {
  if (!_checkRateLimit(req, res)) return;
  try {
    const response = await Auth.login(req.body, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.logo = async (req, res) => {
  try {
    const response = await Auth.logo(req.body.email);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.logout = async (req, res) => {
  try {
    await Auth.logout(req, res);
    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.logoutAll = async (req, res) => {
  try {
    await Auth.logoutAll(req, res);
    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.sessions = async (req, res) => {
  try {
    const response = await Auth.sessions(req);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.revokeSession = async (req, res) => {
  try {
    await Auth.revokeSession(req, req.params.id);
    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.me = async (req, res) => {
  try {
    const response = await Auth.me(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.resetPass = async (req, res) => {
  try {
    const response = await Auth.resetPass(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.updateAny = async (req, res) => {
  try {
    const response = await Auth.updateAny(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.recoverpassword = async (req, res) => {
  if (!_checkRateLimit(req, res)) return;
  try {
    await Auth.recoverpassword(req, res);
    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.verifyCode = async (req, res) => {
  if (!_checkRateLimit(req, res)) return;
  try {
    const response = await Auth.verifyCode(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.resetPassword = async (req, res) => {
  if (!_checkRateLimit(req, res)) return;
  try {
    const response = await Auth.resetPassword(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.sendVerifyMailAccount = async (req, res) => {
  if (!_checkRateLimit(req, res)) return;
  try {
    await Auth.sendVerifyMailAccountJob(req, true);
    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.verifyMailTokenAccount = async (req, res) => {
  try {
    const response = await Auth.verifyMailTokenAccount(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.updatePicture = async (req, res) => {
  try {
    const response = await Auth.updatePicture(req, res);
    res.status(202).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.verifyPhone = async (req, res) => {
  try {
    await Auth.verifyPhone(req, res);
    res.status(200).send();
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.validatePhone = async (req, res) => {
  try {
    const response = await Auth.validatePhone(req, res);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.createCustomer = async (req, res) => {
  try {
    let token = await Auth.createCustomer(req, res);
    res.status(201).send(token);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.mailChange = async (req, res) => {
  try {
    await Auth.mailChange(req.body.email, req.user);
    res.status(200).send({ message: "Revisa el correo" });
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.validatEmailChange = async (req, res) => {
  try {
    await Auth.validateCode(req, res);
    res.status(200).send({ message: "Código correcto" });
  } catch (error) {
    await utils.responseError(res, error);
  }
};

