const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const historySchema = mongoose.Schema({
  method: { type: String, default: false },
  path: { type: String },
  permission: { type: String },
  payload: { type: Object, default: {} }, // Guarda cualquier estructura JSON
  response: { type: Object, default: {} }, // Guarda cualquier estructura JSON
  _createdBy: { type: ObjectId, required: false, ref: "User" },
  createdAt: { type: Number, required: true },
});

const History = mongoose.model("History", historySchema);
module.exports = History;
