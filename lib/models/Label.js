const mongoose = require("mongoose");

const menuSchema = mongoose.Schema({
  label: { type: String, required: true, trim: true },
  description: { type: String, required: false, trim: true },

  status: { type: String, required: true, enum: ["Activo", "Inactivo"] },
  createdAt: { type: Number },
  lastUpdate: { type: Number },
});

const Menu = mongoose.model("Label", menuSchema);
module.exports = Menu;
