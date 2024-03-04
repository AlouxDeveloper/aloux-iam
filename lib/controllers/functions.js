const Function = require('../services/functions')
const user          = require('./user')
const self = module.exports
const utils = require('../config/utils')
//Listo
self.create = async (req, res) => {
    try {
        const create = await Function.create(req.body)
        res.status(201).send(create)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

//Pendiente
self.update = async (req, res) => {
    try {
        const update = await Function.update(req.params.FUNCTION_ID, req.body)

        res.status(200).send(update)

    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Pendiente de preguntar
self.status = async (req, res) => {
    try {
        const status = await Function.status(req.params.FUNCTION_ID, req.body)

        res.status(200).send(status)
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.retrieve = async(req, res) => {    
    try {
        const response = await Function.retrieve()
        res.status(200).send(response)
    } catch (error) {
        res.status(400).send(error)
    }
}
//Listo
self.get  =  async(req, res) => {    
    try {
        const functions = await Function.get( req.params.FUNCTION_ID )
        res.status(200).send(functions)
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.delete  =  async(req, res) => {    
    try {
        await Function.delete(req.params.FUNCTION_ID)

        res.status(200).send('success')

    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.count = async(req, res) => {    
    try {
        const result = await Function.count()
        res.status(200).send({ result })
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}