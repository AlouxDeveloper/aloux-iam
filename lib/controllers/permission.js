const Permission = require('../services/permission')
const self = module.exports
const utils = require('../config/utils')
//Listo
self.create = async (req, res) => {
    try {
        const permission = await Permission.create(req.body)
        res.status(201).send(permission)
    } catch (error) {
        switch(error.code){
            case 11000: obj = { error: 'El campo ' + JSON.stringify(error.keyValue) + ' ya se encuentra dado de alta', suggestion: 'Revisa la información e intenta nuevamente.' }; break
            default: obj = error
        }
        res.status(400).send(obj)
    }
}
//Preguntar
self.update = async (req, res) => {
    try {
        const update = await Permission.update(req.params.PERMISSION_ID, req.body)

        res.status(200).send(update)
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.status = async (req, resp) => {
    try {
        const status = await Permission.status(req.params.PERMISSION_ID, req.body)

        resp.status(200).send(status)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}
//Listo
self.retrieve = async(req, res) => {    
    try {
        const response = await Permission.retrieve()
        res.status(200).send(response)
    } catch (error) {
        res.status(400).send(error)
    }
}
//Listo
self.get  =  async(req, res) => {    
    try {
        const permission = await Permission.get(req.params.PERMISSION_ID)
        res.status(200).send(permission)
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.delete  =  async(req, res) => {    
    try { 

        await Permission.delete( req.params.PERMISSION_ID )

        res.status(200).send('success')
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.count = async(req, res) => {    
    try {
        const result = await Permission.count()
        res.status(200).send({ result })
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}