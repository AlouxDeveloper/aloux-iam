const Totp = require("../services/totp");
const utils = require("../config/utils");
const rateLimit = require("../config/rateLimit");

const self = module.exports;

self.setup = async (req, res) => {
  // El código es de 6 dígitos: sin tope se adivina a fuerza bruta dentro de la vigencia del token temporal
  if (!rateLimit.check(req, res, [rateLimit.tokenKey("totp", req.query.tempToken || req.body?.tempToken)])) return;
  try {
    const tempToken = req.query.tempToken || req.body?.tempToken;
    const response = await Totp.setup(tempToken);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.activate = async (req, res) => {
  // El código es de 6 dígitos: sin tope se adivina a fuerza bruta dentro de la vigencia del token temporal
  if (!rateLimit.check(req, res, [rateLimit.tokenKey("totp", req.headers["x-temp-token"] || req.body?.tempToken)])) return;
  try {
    const tempToken = req.headers["x-temp-token"] || req.body?.tempToken;
    const response = await Totp.activate(tempToken, req.body.token);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.checkLogin = async (req, res) => {
  // El código es de 6 dígitos: sin tope se adivina a fuerza bruta dentro de la vigencia del token temporal
  if (!rateLimit.check(req, res, [rateLimit.tokenKey("totp", req.body?.tempToken)])) return;
  try {
    const { token, tempToken } = req.body;
    if (!token || !tempToken)
      return res.status(400).send({ message: "Faltan parámetros" });

    const response = await Totp.checkLogin(token, tempToken, res, req.headers["user-agent"]);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.adminToggle = async (req, res) => {
  try {
    const response = await Totp.adminToggle(req.params.USER_ID, req.body.enabled, req);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};