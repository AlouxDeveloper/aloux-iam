const mongoose = require('mongoose')

const permissionSchema = mongoose.Schema({
    description:    { type: String, required: true, trim: true },
    method:         { type: String, required: true, unique: true },
    api:            { type: String, required: true },
    endpoint:       { type: String, required: true },
    auth:           { type: Number, required: true, default: 1},
    _menu:          { type: mongoose.Schema.Types.ObjectId,required: true,ref: 'Menu'},
    
    status:         { type: String },
    createdAt:      { type: Number },
    lastUpdate:     { type: Number }
})

const Permission = mongoose.model('Permission', permissionSchema)
module.exports = Permission