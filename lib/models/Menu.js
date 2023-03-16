const mongoose = require('mongoose')

const menuSchema = mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        required: true,
        trim: true
    },
    index: {
        type: Number
    },
    isActive: {
        type: Boolean
    },
    _menu: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Menu'
    },
    date: {
        type: Number
    },
    lastUpdate: {
        type: Number,
        required: false,
    },
})

module.exports = mongoose.model('Menu', menuSchema)