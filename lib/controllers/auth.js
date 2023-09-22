const Auth = require('../services/auth')
const utils = require('../config/utils')

const self = module.exports;

self.email = async (req, res) => {
    try {
        const response = await Auth.searchEmail(req.email)
        res.status(200).send({ email: response })
    } catch (error) {
        utils.responseError(error)
    }
}

self.login = async (req, res) => {
    try {
        const response = await Auth.login(req.body, res)
        res.status(200).send(response)
    } catch (error) {
        utils.responseError(error)
    }
}

self.logout = async (req, res) => {
    try {
        await Auth.logout(req, res)
        res.status(200).send()
    } catch (error) {
        utils.responseError(error)
    }
}

self.logoutAll = async (req, res) => {
    try {
        Auth.logoutAll(req.body)
        res.status(200).send()
    } catch (error) {
        utils.responseError(error)
    }
}


self.me = async (req, res) => {
    try {
        const response = await Auth.me(req, res)
        res.status(200).send(response)
    } catch (error) {
        utils.responseError(error)
    }
}

self.resetPass = async (req, res) => {
    try {

        let _id = req.user._id

        const usuario = await User.findOne({ _id })

        if (usuario) {

            usuario.pwd = req.body.pwd
            usuario.lastUpdate = new Date().getTime();
            await usuario.save()

            res.status(200).send("password updated successfully");
        } else return res.status(409).send({ error: 'User no encontrado.' })

    } catch (error) {
        res.status(400).send(error)
    }
}

self.recoverpassword = async (req, res) => {
    try {
        const correo = req.body.email

        const user = await User.findOne({ email: correo });
        if (!user) {
            return res.status(409).send({ error: 'User no encontrado.' });
        }

        const code = await self.generatecode();

        await self.sendcodemail(correo, code);

        user.validateKey.resetPassword.resetCode = code;
        let time = new Date()
        const sumarMinutos = new Date(time.getTime() + 5 * 60000)
        user.validateKey.limitCodeTime = (new Date(sumarMinutos)).getTime()

        await user.save();

        res.status(200).send();
    } catch (error) {
        res.status(500).send('Error al envíar el correo electronico')
        console.log(error)
    }
}

self.generatecode = async () => {
    let code = "";
    let random = [];

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
        const nivel = getRandomArbitrary(0, 10);
        if (!isReapeat(random, nivel)) {
            random.push({ nivel: nivel });
        }
        if (random.length < 4) {
            getRandom()
        }
    }

    getRandom()

    for (let i in random) {
        code += random[i].nivel;
    }

    return code;
}

self.sendcodemail = async (email, code) => {
    try {

        let user = await User.findOne({ email: email }, { name: 1, email: 1 })

        let file = fs.readFileSync(process.env.TEMPLATE_RECOVER_PASSWORD, "utf8")
        file = file.replace('+++user+++', user.name)
        file = file.replace('+++code+++', code)

        return await alouxAWS.sendCustom(user.email, file, "Código de recuperación de contraseña");

    } catch (error) {
        throw new Error('Ocurrio un error al envìar el correo electronico');
    }
}

self.verifyCode = async (req, res) => {
    try {
        const correo = req.body.email
        var body = JSON.parse(JSON.stringify(req.body));

        const user = await User.findOne({ email: correo });

        const newTime = new Date().getTime();

        if (!user) {
            return res.status(409).send({ error: 'No se pudo validar la información.' });
        }

        if (user.validateKey.limitCodeTime < newTime)
            return res.status(409).send({ error: 'El código ha caducado.' });

        if (user.validateKey.resetPassword.resetCode == body.resetCode) {
            user.validateKey.resetPassword.validCode = true;

            await user.save();
        }
        else
            return res.status(409).send('Código incorrecto.');


        res.status(200).send();
    } catch (error) {
        res.status(400).send(error)
    }
}

self.resetPassword = async (req, res) => {
    try {
        let correo = req.body.email;
        var body = JSON.parse(JSON.stringify(req.body));

        const usuario = await User.findOne({ email: correo })

        if (!usuario) {
            return res.status(409).send({ error: 'User no encontrado.' })
        }

        const newTime = new Date().getTime()

        if(usuario.validateKey.limitCodeTime < newTime){
            
            usuario.validateKey.limitCodeTime = null;
            usuario.validateKey.resetPassword.resetCode = null;
            usuario.validateKey.resetPassword.validCode = false;

            return res.status(409).send({error: 'El código ha caducado.'})
        }

        if (usuario.validateKey.resetPassword.validCode == true && usuario.validateKey.resetPassword.resetCode == req.body.resetCode) {
            usuario.pwd = body.pwd;
            usuario.validateKey.resetPassword.validCode = false;
            usuario.validateKey.resetPassword.resetCode = null;
            usuario.validateKey.limitCodeTime = null;
            usuario.lastUpdate = new Date().getTime();
            usuario.tokens = []

            await usuario.save()

            const token = await usuario.generateAuthToken()

            res.cookie("token", token, {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
                expires: dayjs().add(30, "days").toDate(),
            });

            res.status(200).send({ token })
        }
        else {
            return res.status(401).send("El código no ha sido verificado");
        }

    } catch (error) {
        res.status(400).send(error)
    }
}

self.updateAny = async (req, res) => {
    try {

        const _id = req.user._id
        const update = await User.updateOne({ _id }, { $set: req.body, lastUpdate: (new Date()).getTime() })

        res.status(202).send(update)
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}

self.updatePicture = async (req, res) => {
    try {

        const _id = req.user._id

        let user = await User.findOne({ _id })

        if (!user) {
            throw new Error('Upss! No se encontró el Elemento')
        }

        const url = await alouxAWS.upload('user/urlImg-' + user._id, req.files.urlImg)

        await User.updateOne({ _id: user._id }, { urlImg: url, lastUpdate: (new Date()).getTime() })

        const result = await User.findOne({_id: user._id})

        res.status(202).send(result)
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}


self.count = async (req, res) => {
    try {
        let result = await User.find({}).countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}

self.verifyPhone = async (req, res) => {

    try {
        const phone = req.user.phone

        const user = await User.findOne({ phone: phone });
        if (!user) {
            return res.status(409).send({ error: 'User no encontrado.' });
        }

        const code = await self.generatecode();
        const Message = "Docket: su código de verificación es:" + " " + code + " " + "Su código vence en 10 minutos. No comparta su código. Por favor no responda a este mensaje"

        await User.updateOne({ _id: user._id }, { 'validateKey.validatePhone.codeVerifyPhone': code, 'validateKey.validatePhone.validCodePhone': false })

        await alouxAWS.sendMessagePhone(phone, Message)

        user.validateKey.validatePhone.codeVerifyPhone = code;
        let time = new Date()
        const sumarMinutos = new Date(time.getTime() + 10 * 60000)
        user.limitCodeTime = (new Date(sumarMinutos)).getTime()

        await user.save();

        res.status(200).send();
    } catch (error) {
        res.status(500).send('Error al envíar el mensaje')
        console.log(error)
    }

}

self.validatePhone = async (req, res) => {
    try {
        const phone = req.user.phone
        var body = JSON.parse(JSON.stringify(req.body));

        const user = await User.findOne({ phone: phone });

        const newTime = new Date().getTime();

        if (!user) {
            return res.status(409).send({ error: 'No se pudo validar la información.' });
        }

        if (user.limitCodeTime < newTime)
            return res.status(409).send({ error: 'El código ha caducado.' });


        if (user.validateKey.validatePhone.codeVerifyPhone == body.codeVerifyPhone) {
            user.validateKey.validatePhone.codeVerifyPhone = null;
            user.limitCodeTime = null;
            user.validateKey.validatePhone.validCodePhone = true;

            await user.save();
        }
        else
            return res.status(409).send('Código incorrecto.');


        res.status(200).send("Teléfono Verificado");
    } catch (error) {
        res.status(400).send(error)
    }
}

self.sendverifyToken = async (correo, token) => {
    try {

        let user = await User.findOne({ email: correo }, { name: 1, email: 1 })

        let file = fs.readFileSync(process.env.TEMPLATE_VERIFY_EMAIL, "utf8")
        file = file.replace('+++user+++', user.name)
        file = file.replace('+++token+++', token)


        return await alouxAWS.sendCustom(user.email, file, "Verifica tu cuenta de "+process.env.PROJECT_NAME);
    } catch (error) {
        throw new Error('Ocurrio un error al envìar el correo electronico');
    }
}

self.sendVerifyMailAccount = async (req, res) => {
    try {
        const result = await self.sendVerifyMailAccountJob(req, true)

        res.status(200).send(result)    
    }catch(error) {
        res.status(400).send({error:error.message})
    }
}

self.sendVerifyMailAccountJob = async (data, ban) => {
    // Generating recover pwd code and sending to user email address
    try {

        let user
        if(ban == true){
            user = await User.findOne({ email: data.body.email }).lean()
        }else{
            user = await User.findOne({ email: data }).lean()
        }

        const token = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET);

        await User.updateOne({ _id: user._id }, { 'validateKey.validateEmail.verifyMailToken': token, 'validateKey.validateEmail.emailVerified': false })

        //var urlToken = process.env.VERIFY_ACCOUNT_URL + "=" + token

        return await self.sendverifyToken(user.email, token);

    } catch (error) {
        let obj = error
        if(!error.code){
            obj = {
                code: 400,
                title: 'Error',
                detail: error.message,
                suggestion: 'Revisa el detalle del error'
            }
        }
        return obj
    }
}

self.sendValidateEmail = async (email) => {
    try {

        let user = await User.findOne({ email: email }, { name: 1, email: 1 })

        let file = fs.readFileSync(process.env.TEMPLATE_WELCOME, "utf8")
        file = file.replace('+++user+++', user.name)

        return await sesSDK.sendCustom(user.email, file, 'Bienvenido a '+process.env.PROJECT_NAME);

    } catch (error) {
        throw new Error('Ocurrio un error al envìar el correo electronico');
    }
}

self.verifyMailTokenAccount = async (req, res) => {
    try {
        token = req.params.token

        const data = jwt.verify(token, process.env.AUTH_SECRET)

        let user = await User.findOne({ _id: data._id, 'validateKey.validateEmail.verifyMailToken': token })

        if (!user) {
            throw new Error('¡Error!, Token no valido');
        } else {
            user.validateKey.validateEmail.verifyMailToken = null
            user.validateKey.validateEmail.emailVerified = true
            user.save()
        }

        if (user.validateKey.validateEmail.emailVerified == true) {
            await self.sendValidateEmail(user.email)
        }

        res.status(200).send('Usuario verificado con éxito')
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}

