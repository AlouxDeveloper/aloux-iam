const User = require('../models/User')
const s3 = require('../services/s3')
const ses = require('../services/ses')
const sns = require('../services/sns')
const bcrypt = require('bcryptjs')
const dayjs = require("dayjs")

const self = module.exports

self.searchEmail = async (email) => {
    const userLogin = await User.findOne({ email: email })
    if (!userLogin) {
        return false
    }
    else {
        return true
    }
}

self.login = async (body, res) => {

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
        })

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
            })

            return { token }
        }
    }
}

self.logout = async (req, res) => {
    const user = await User.findOne({ _id: req.user._id })
    user.tokens = user.tokens.filter((token) => {
        return token.token != req.token
    })

    cookies.set('token', { expires: Date.now() })

    await user.save()
    return true
}

self.logoutAll = async (req, res) => {
    req.user.tokens = []
    await req.user.save()
    cookies.set('token', { expires: Date.now() })

    return true
}

self.getPermission = (user) => {
    let result = {}
    for (let i in user._functions) {
        if (user._functions[i].status === 'Activo') {
            for (let j in user._functions[i]._permissions) {
                if (user._functions[i]._permissions[j].status === 'Activo') {
                    result[user._functions[i]._permissions[j].api] = true
                }
            }
        }
    }
    return result
}

self.getMenu = (user) => {
    let result = []
    for (let i in user._functions) {
        if (user._functions[i].status === 'Activo') {
            for (let j in user._functions[i]._menu) {
                if (user._functions[i]._menu[j].status === 'Activo')
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
        { path: "_functions", populate: [{ path: "_permissions" }] },
        { path: "_menus" }
    ]).lean()

    // Obtener menús y funciones sin repertir y activas
    user.menus = self.getMenu(user)
    user.permissions = self.getPermission(user)
    for (let i in user._functions) {
        user._functions[i]._permissions = null
    }

    return user
}

self.resetPass = async (req, res) => {

    const usuario = await User.findOne({ _id: req.user._id })

    if (usuario) {
        usuario.pwd = req.body.pwd
        usuario.lastUpdate = new Date().getTime()
        await usuario.save()

        return "password updated successfully"
    } else {
        throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el Usuario exista', error: new Error() }
    }
}

self.generatecode = async () => {
    let code = ""
    let random = []

    function getRandomArbitrary(min, max) {
        return Math.floor(Math.random() * (max - min) + min)
    }
    function isReapeat(arr, value) {
        for (let i in arr) {
            if (arr[i].nivel === value) {
                return true
            }
        }
        return false
    }

    function getRandom() {
        const nivel = getRandomArbitrary(0, 10)
        if (!isReapeat(random, nivel)) {
            random.push({ nivel: nivel })
        }
        if (random.length < 4) {
            getRandom()
        }
    }

    getRandom()

    for (let i in random) {
        code += random[i].nivel
    }

    return code
}

self.sendcodemail = async (email, code) => {

    const user = await User.findOne({ email: email }, { name: 1, email: 1 })

    let file = fs.readFileSync(process.env.TEMPLATE_RECOVER_PASSWORD, "utf8")
    file = file.replace('+++user+++', user.name)
    file = file.replace('+++code+++', code)
    await ses.sendCustom(user.email, file, "Código de recuperación de contraseña")

    return true
}

self.recoverpassword = async (req, res) => {

    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el Usuario exista', error: new Error() }
    }

    const code = await self.generatecode()
    await self.sendcodemail(correo, code)

    user.validateKey.resetPassword.resetCode = code
    let time = new Date()
    const sumarMinutos = new Date(time.getTime() + 5 * 60000)
    user.validateKey.limitCodeTime = (new Date(sumarMinutos)).getTime()

    await user.save()

    return true
}

self.verifyCode = async (req, res) => {

    const correo = req.body.email
    let body = JSON.parse(JSON.stringify(req.body))
    const user = await User.findOne({ email: correo })
    const newTime = new Date().getTime()

    if (!user) {
        throw { code: 409, title: 'No se pudo validar la información.', detail: '', suggestion: 'Verifica que el usuario exista', error: new Error() }
    }

    if (user.validateKey.limitCodeTime < newTime) {
        throw { code: 409, title: 'El código ha caducado.', detail: '', suggestion: 'Vuelve a intentarlo', error: new Error() }
    }

    if (user.validateKey.resetPassword.resetCode == body.resetCode) {
        user.validateKey.resetPassword.validCode = true
        await user.save()
    }
    else {
        throw { code: 409, title: 'Código incorrecto.', detail: '', suggestion: 'El código no coincide verifica el valor', error: new Error() }
    }

    return true
}


self.resetPassword = async (req, res) => {

    let correo = req.body.email
    var body = JSON.parse(JSON.stringify(req.body))
    let usuario = await User.findOne({ email: correo })

    if (!usuario) {
        throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el usuario exista', error: new Error() }
    }

    const newTime = new Date().getTime()

    if (usuario.validateKey.limitCodeTime < newTime) {

        usuario.validateKey.limitCodeTime = null
        usuario.validateKey.resetPassword.resetCode = null
        usuario.validateKey.resetPassword.validCode = false
        await usuario.save()
        throw { code: 409, title: 'El código ha caducado.', detail: '', suggestion: 'Vuelve a intentarlo', error: new Error() }
    }

    if (usuario.validateKey.resetPassword.validCode == true && usuario.validateKey.resetPassword.resetCode == req.body.resetCode) {
        usuario.pwd = body.pwd
        usuario.validateKey.resetPassword.validCode = false
        usuario.validateKey.resetPassword.resetCode = null
        usuario.validateKey.limitCodeTime = null
        usuario.lastUpdate = new Date().getTime()
        usuario.tokens = []

        await usuario.save()

        const token = await usuario.generateAuthToken()

        res.cookie("token", token, {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
            expires: dayjs().add(30, "days").toDate(),
        })

        return { token }
    }
    else {
        throw { code: 401, title: 'El código no ha sido verificado', detail: '', suggestion: 'Vuelve a intentarlo', error: new Error() }
    }
}

self.sendverifyToken = async (correo, token) => {


    let user = await User.findOne({ email: correo }, { name: 1, email: 1 })

    let file = fs.readFileSync(process.env.TEMPLATE_VERIFY_EMAIL, "utf8")
    file = file.replace('+++user+++', user.name)
    file = file.replace('+++token+++', token)

    await ses.sendCustom(user.email, file, "Verifica tu cuenta de " + process.env.PROJECT_NAME)
    return true
}

self.sendVerifyMailAccountJob = async (data, ban) => {
    // Generating recover pwd code and sending to user email address
    let user
    if (ban == true) {
        user = await User.findOne({ email: data.body.email }).lean()
    } else {
        user = await User.findOne({ email: data }).lean()
    }

    const token = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET)

    await User.updateOne({ _id: user._id }, { 'validateKey.validateEmail.verifyMailToken': token, 'validateKey.validateEmail.emailVerified': false })
    await self.sendverifyToken(user.email, token)

    return true
}

self.sendValidateEmail = async (email) => {
    let user = await User.findOne({ email: email }, { name: 1, email: 1 })

    let file = fs.readFileSync(process.env.TEMPLATE_WELCOME, "utf8")
    file = file.replace('+++user+++', user.name)

    return await sesSDK.sendCustom(user.email, file, 'Bienvenido a ' + process.env.PROJECT_NAME)
}

self.verifyMailTokenAccount = async (req, res) => {

    let token = req.params.token
    const data = jwt.verify(token, process.env.AUTH_SECRET)

    let user = await User.findOne({ _id: data._id, 'validateKey.validateEmail.verifyMailToken': token })

    if (!user) {
        throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el usuario exista', error: new Error() }
    } else {
        user.validateKey.validateEmail.verifyMailToken = null
        user.validateKey.validateEmail.emailVerified = true
        user.save()
    }

    if (user.validateKey.validateEmail.emailVerified == true) {
        await self.sendValidateEmail(user.email)
    }

    return 'Usuario verificado con éxito'
}

self.updatePicture = async (req, res) => {

    let user = await User.findOne({ _id: req.user._id })
    if (!user) {
        throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el usuario exista', error: new Error() }
    }

    const url = await s3.upload('user/urlImg-' + user._id, req.files.urlImg)
    await User.updateOne({ _id: user._id }, { urlImg: url, lastUpdate: (new Date()).getTime() })
    const result = await User.findOne({ _id: user._id })

    return result
}

self.verifyPhone = async (req, res) => {

        const user = await User.findOne({ phone: req.user.phone })
        if (!user) {
            throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el usuario exista', error: new Error() }
        }

        const code = await self.generatecode()
        const Message =  "Tu código de "+process.env.PROJECT_NAME +" es: "+code+". No lo compartas con nadie. "+process.env.PROJECT_URL
        await User.updateOne({ _id: user._id }, { 'validateKey.validatePhone.codeVerifyPhone': code, 'validateKey.validatePhone.validCodePhone': false })
        await sns.sendMessagePhone(req.user.phone, Message)

        user.validateKey.validatePhone.codeVerifyPhone = code
        let time = new Date()
        const sumarMinutos = new Date(time.getTime() + 10 * 60000)
        user.limitCodeTime = (new Date(sumarMinutos)).getTime()
        await user.save()

        return true
}

self.validatePhone = async (req, res) => {
    
        let body = JSON.parse(JSON.stringify(req.body))
        const user = await User.findOne({ phone: req.user.phone })
        const newTime = new Date().getTime()

        if (!user) {
            throw { code: 409, title: 'Usuario no encontrado.', detail: '', suggestion: 'Verifica que el usuario exista', error: new Error() }
        }

        if (user.limitCodeTime < newTime){
            throw { code: 409, title: 'El código ha caducado.', detail: '', suggestion: 'Verifica que el código sea correcto', error: new Error() }
        }

        if (user.validateKey.validatePhone.codeVerifyPhone == body.codeVerifyPhone) {
            user.validateKey.validatePhone.codeVerifyPhone = null
            user.limitCodeTime = null
            user.validateKey.validatePhone.validCodePhone = true

            await user.save()
        }
        else{
            throw { code: 409, title: 'Código incorrecto.', detail: '', suggestion: 'Verifica el código', error: new Error() }
        }

        return "Teléfono Verificado"
}