const mongoose = require('mongoose')

const functionsSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    _permission: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Permission'
        }
    ],
    isActive: {
        type: Boolean
    },
    date: {
        type: Number
    },
    lastUpdate: {
        type: Number
    },
})

module.exports = mongoose.model('Functions', functionsSchema)