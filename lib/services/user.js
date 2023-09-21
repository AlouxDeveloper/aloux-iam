const User = require('../models/User')

const self = module.exports;

self.create = async (body) => {
    let user
    user = await User.findOne({email: body.email}).lean()

    if(user){
        throw {
            code: 404,
            title: 'Upss!',
            detail: '',
            suggestion: 'El correo ya se encuentra resgitrado',
            error: new Error()
        }
    }

    user = new User(body)
    user.createdAt = (new Date()).getTime()
    user.status = 'Activo'

    delete user.pwd

    await user.save()

    return user
}

self.update = async (USER_ID, body) => {
    const _id = USER_ID
    const user = await User.findOne({ _id }).countDocuments().lean()

    if (!user) {
        throw {
            code: 404,
            title: 'Upss!',
            detail: 'No se encontró el elemento',
            suggestion: 'Verifica que el usuario aun este activo en la plataforma',
            error: new Error()
        }
    }

    if (body.phone) {
        await User.updateOne({ _id }, { 'validateKey.validatePhone.validCodePhone': false })
    }

    body.lastUpdate = (new Date()).getTime()
    const result = await User.updateOne({ _id }, { $set: body })

    return result
}

self.status = async (USER_ID, body) => {
    const _id = USER_ID
    const user = await User.findOne({ _id })

    if (!user) {
        throw {
            code: 404,
            title: 'Upss!',
            detail: 'No se encontró el elemento',
            suggestion: 'Verifica que el usuario aun este activo en la plataforma',
            error: new Error()
        }
    }

    user.status = body.status;
    user.lastUpdate = (new Date()).getTime()

    const result = await user.save();

    return result 
}

self.updatepassword = async (body, USER_ID) => {
    let user
    user = User(body)
    const _id = USER_ID

    user = await User.findOne({ _id })

    if (!user) {
        throw {
            code: 404,
            title: 'Upss!',
            detail: 'No se encontró el elemento',
            suggestion: 'Verifica que el usuario aun este activo en la plataforma',
            error: new Error()
        }
    }

    user.pwd = body.pwd;
    user.lastUpdate = (new Date()).getTime()

    const result = await user.save();

    return result 
}