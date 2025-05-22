const mongoose = require("mongoose");

const businessSchema = mongoose.Schema({
  name: { type: String, required: true, trim: true, maxLength: 200 },
  imgUrl: { type: String, required: false, trim: true, maxLength: 500 },
  data: { type: Object, required: false },

  status: { type: String, required: true, enum: ["Activo", "Inactivo"] },
  createdAt: { type: Number },
  lastUpdate: { type: Number },
});

const Business = mongoose.model("Company", businessSchema);
module.exports = Business;
