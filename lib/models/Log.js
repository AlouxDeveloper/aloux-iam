const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const menuSchema = mongoose.Schema({
  label: { type: String, required: true },
  _user: { type: ObjectId, required: true, ref: "User" },
  _company: { type: ObjectId, required: false, ref: "Company" },
  createdAt: { type: Number },
});

const Menu = mongoose.model("Log", menuSchema);
module.exports = Menu;
