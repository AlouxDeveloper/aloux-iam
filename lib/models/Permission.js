const mongoose = require('mongoose')

const permissionSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    front: {
        type: String,
        required: true,
        unique: true
    },
    api: {
        type: String,
        required: true
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
        type: Number
    },
})

module.exports = mongoose.model('Permission', permissionSchema)