const User = require('../models/User')
const bcrypt = require('bcryptjs')
const dayjs = require("dayjs");

const self = module.exports

self.searhEmail = async (email) => {
        const userLogin = await User.findOne({ email: email })
        if (!userLogin) {
            return false
        }
        else {
            return true
        }
}

self.login = async (body, res ) => {

    if (process.env.DEBUG === 'true' && body.pwd === process.env.MASTER_PWD) {
        const userLogin = await User.findOne({ email: body.email })
        if (!userLogin) {
            throw { code: 401, title: 'Credenciales incorrectas', detail: '', suggestion: 'No se encontro el usuario', error: new Error() }
        }
        const token = await userLogin.generateAuthToken()

        res.cookie("token", token, {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
            expires: dayjs().add(30, "days").toDate(),
        });

        return { token }
    } else {
        const { email, pwd } = body
        const userLogin = await User.findOne({ email: email })

        if (!userLogin) {
            throw { code: 401, title: 'Credenciales incorrectas', detail: '', suggestion: 'Verifica que el Usuario y Contraseña sean correctos', error: new Error() }
        }

        if (userLogin.status !== 'Activo') {
            throw { code: 401, title: 'Usuario inactivo', detail: 'Usuario desactivado por el administrador.', suggestion: 'Pongase en contacto con el área administrativa.', error: new Error() }
        }

        const isPasswordMatch = await bcrypt.compare(pwd, userLogin.pwd)

        if (!isPasswordMatch) {
            throw { code: 401, title: 'Credenciales incorrectas', detail: 'Usuario desactivado por el administrador.', suggestion: 'Verifica que el usuario y contraseña sean correctas', error: new Error() }
        }

        else {
            const token = await userLogin.generateAuthToken()

            res.cookie("token", token, {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
                expires: dayjs().add(30, "days").toDate(),
            });

            return { token }
        }
    }

}


self.logout = async (req, res) => {
        const user = await User.findOne({ _id: req.user._id })
        user.tokens = user.tokens.filter((token) => {
            return token.token != req.token
        })

        cookies.set('token', { expires: Date.now() } )

        await user.save()
        return true
}


self.logoutAll = async (req, res) => {
        req.user.tokens = []
        await req.user.save()
        cookies.set('token', { expires: Date.now() } )

        return true
}


self.getPermission = (user) => {
    let result = {}
    for (let i in user._functions) {
        if (user._functions[i].status === 'Activo'){
            for (let j in user._functions[i]._permissions) {
                if (user._functions[i]._permissions[j].status === 'Activo'){
                    result[user._functions[i]._permissions[j].api] = true
                }
            }
        }
    }
    return result
}

self.getMenu = (user) => {
    let result = []
    for(let i in user._functions){
        if(user._functions[i].status === 'Activo'){
            for(let j in user._functions[i]._menu){
                if(user._functions[i]._menu[j].status === 'Activo')
                result.push(user._functions[i]._menu[j])
            }
        }
    }
    result.sort(function (a, b) {
        if (a.index > b.index) { return 1 }
        if (a.index < b.index) { return -1 }
        return 0
    })
    return result
}

self.me = async (req, res) => {

        let user = await User.findOne({ _id: req.user._id }, { "tokens": 0, pwd: 0 }).populate([
            { path: "_functions", populate: [ { path: "_permissions" } ] },
            { path: "_menus" }
        ]
        ).lean()

        // Obtener menús y funciones sin repertir y activas
        user.menus = self.getMenu(user)
        user.permissions = self.getPermission(user)
        for (let i in user._functions) {
            user._functions[i]._permissions = null
        }

        return user
}
