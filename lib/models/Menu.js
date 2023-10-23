const mongoose = require('mongoose')

const menuSchema = mongoose.Schema({
    label:          { type: String, required: true, trim: true },
    path:            { type: String, required: true, trim: true },
    icon:           { type: String, required: true, trim: true },
    index:          { type: Number },
    _menu:          { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' },

    status:         { type: String },
    createdAt:      { type: Number },
    lastUpdate:     { type: Number }
})

const Menu = mongoose.model("Menu", menuSchema)
module.exports = Menu