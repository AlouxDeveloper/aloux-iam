const passwordService = require("../services/generatePassword");

const self = module.exports;

self.generate = (req, res) => {
  try {
    const length = Number(req.query.length) || 12;
    const password = passwordService.generatePassword(length);
    return res.json({ password });
  } catch (error) {
    return res.status(500).json({ message: "Error al generar la contraseña", error });
  }
};