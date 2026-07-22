const Totp = require("../services/totp");
const utils = require("../config/utils");

const self = module.exports;

self.setup = async (req, res) => {
  try {
    const tempToken = req.query.tempToken || req.body?.tempToken;
    const response = await Totp.setup(tempToken);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.activate = async (req, res) => {
  try {
    const tempToken = req.headers["x-temp-token"] || req.body?.tempToken;
    const response = await Totp.activate(tempToken, req.body.token);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};

self.checkLogin = async (req, res) => {
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
    const response = await Totp.adminToggle(req.params.USER_ID, req.body.enabled);
    res.status(200).send(response);
  } catch (error) {
    await utils.responseError(res, error);
  }
};