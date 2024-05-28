const mongoose = require("mongoose")

const userProvisional = mongoose.Schema({
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    code: { type: Number, required: true },
    createdAt: { type: Number },
    lastUpdate: { type: Number }
})

const UserProvisional = mongoose.model("UserProvisional", userProvisional)
module.exports = UserProvisional