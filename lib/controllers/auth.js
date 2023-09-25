const Auth = require('../services/auth')
const utils = require('../config/utils')

const self = module.exports;

self.email = async (req, res) => {
    try {
        const response = await Auth.searchEmail(req.email)
        res.status(200).send({ email: response })
    } catch (error) {
        await utils.responseError(error)
    }
}

self.login = async (req, res) => {
    try {
        const response = await Auth.login(req.body, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}

self.logout = async (req, res) => {
    try {
        await Auth.logout(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(error)
    }
}

self.logoutAll = async (req, res) => {
    try {
        await Auth.logoutAll(req.body)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(error)
    }
}

self.me = async (req, res) => {
    try {
        const response = await Auth.me(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}

self.resetPass = async (req, res) => {
    try {
        const response = await Auth.resetPass(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}

self.recoverpassword = async (req, res) => {
    try {
        await Auth.recoverpassword(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(error)
    }
}

self.verifyCode = async (req, res) => {
    try {
        await Auth.verifyCode(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(error)
    }
}

self.resetPassword = async (req, res) => {
    try {
        const response = await Auth.resetPassword(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}

self.sendVerifyMailAccount = async (req, res) => {
    try {
        await Auth.sendVerifyMailAccountJob(req, true)
        res.status(200).send()
    }catch(error) {
        await utils.responseError(error)
    }
}

self.verifyMailTokenAccount = async (req, res) => {
    try {
        const response = await Auth.verifyMailTokenAccount(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}

self.updatePicture = async (req, res) => {
    try {
        const response = await Auth.updatePicture(req, res)
        res.status(202).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}

self.verifyPhone = async (req, res) => {
    try {
        await Auth.verifyPhone(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(error)
    }
}

self.validatePhone = async (req, res) => {
    try {
        const response = await Auth.validatePhone(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(error)
    }
}
// self.verifyPhone = async (req, res) => {

//     try {
//         const phone = req.user.phone

//         const user = await User.findOne({ phone: phone });
//         if (!user) {
//             return res.status(409).send({ error: 'User no encontrado.' });
//         }

//         const code = await self.generatecode();
//         const Message = "Su código de verificación es:" + " " + code + " " + "Su código vence en 10 minutos. No comparta su código. Por favor no responda a este mensaje"

//         await User.updateOne({ _id: user._id }, { 'validateKey.validatePhone.codeVerifyPhone': code, 'validateKey.validatePhone.validCodePhone': false })

//         await alouxAWS.sendMessagePhone(phone, Message)

//         user.validateKey.validatePhone.codeVerifyPhone = code;
//         let time = new Date()
//         const sumarMinutos = new Date(time.getTime() + 10 * 60000)
//         user.limitCodeTime = (new Date(sumarMinutos)).getTime()

//         await user.save();

//         res.status(200).send();
//     } catch (error) {
//         res.status(500).send('Error al envíar el mensaje')
//         console.log(error)
//     }

// }

// self.validatePhone = async (req, res) => {
//     try {
//         const phone = req.user.phone
//         var body = JSON.parse(JSON.stringify(req.body));

//         const user = await User.findOne({ phone: phone });

//         const newTime = new Date().getTime();

//         if (!user) {
//             return res.status(409).send({ error: 'No se pudo validar la información.' });
//         }

//         if (user.limitCodeTime < newTime)
//             return res.status(409).send({ error: 'El código ha caducado.' });


//         if (user.validateKey.validatePhone.codeVerifyPhone == body.codeVerifyPhone) {
//             user.validateKey.validatePhone.codeVerifyPhone = null;
//             user.limitCodeTime = null;
//             user.validateKey.validatePhone.validCodePhone = true;

//             await user.save();
//         }
//         else
//             return res.status(409).send('Código incorrecto.');


//         res.status(200).send("Teléfono Verificado");
//     } catch (error) {
//         res.status(400).send(error)
//     }
// }

