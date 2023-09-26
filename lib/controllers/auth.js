const Auth = require('../services/auth')
const utils = require('../config/utils')

const self = module.exports

self.email = async (req, res) => {
    try {
        const response = await Auth.searchEmail(req.body.email)
        res.status(200).send({ email: response })
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.login = async (req, res) => {
    try {
        const response = await Auth.login(req.body, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.logout = async (req, res) => {
    try {
        await Auth.logout(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.logoutAll = async (req, res) => {
    try {
        await Auth.logoutAll(req.body)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.me = async (req, res) => {
    try {
        const response = await Auth.me(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.resetPass = async (req, res) => {
    try {
        const response = await Auth.resetPass(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.recoverpassword = async (req, res) => {
    try {
        await Auth.recoverpassword(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.verifyCode = async (req, res) => {
    try {
        await Auth.verifyCode(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.resetPassword = async (req, res) => {
    try {
        const response = await Auth.resetPassword(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.sendVerifyMailAccount = async (req, res) => {
    try {
        await Auth.sendVerifyMailAccountJob(req, true)
        res.status(200).send()
    }catch(error) {
        await utils.responseError(res,error)
    }
}

self.verifyMailTokenAccount = async (req, res) => {
    try {
        const response = await Auth.verifyMailTokenAccount(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.updatePicture = async (req, res) => {
    try {
        const response = await Auth.updatePicture(req, res)
        res.status(202).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.verifyPhone = async (req, res) => {
    try {
        await Auth.verifyPhone(req, res)
        res.status(200).send()
    } catch (error) {
        await utils.responseError(res,error)
    }
}

self.validatePhone = async (req, res) => {
    try {
        const response = await Auth.validatePhone(req, res)
        res.status(200).send(response)
    } catch (error) {
        await utils.responseError(res,error)
    }
}