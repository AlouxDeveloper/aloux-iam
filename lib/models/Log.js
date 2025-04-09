const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const menuSchema = mongoose.Schema({
  _label: { type: ObjectId, required: true, ref: "Label" },
  _user: { type: ObjectId, required: true, ref: "User" },
  createdAt: { type: Number },
});

const Menu = mongoose.model("Log", menuSchema);
module.exports = Menu;
