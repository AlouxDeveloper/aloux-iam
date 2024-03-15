const mongoose = require('mongoose')

const functionsSchema = mongoose.Schema({
    name:           { type: String, required: true, trim: true, unique: true },
    description:    { type: String, trim: true },
    _permissions:   [ { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Permission' } ],
    _menus:         [ { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Menu' } ],
    status:         { type: String, required: true, enum: ['Activo','Inactivo'] },
    createdAt:      { type: Number },
    lastUpdate:     { type: Number }
})

const Functions = mongoose.model("Functions", functionsSchema)
module.exports = Functions