const Menu = require('../services/menu')
const self = module.exports
const utils = require('../config/utils')
//Listo
self.create = async (req, res) => {
    try {
        const create =  await Menu.create(req.body)
        res.status(201).send(create)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}
//Falta
self.update = async (req, res) => {
    try {
        const update = await Menu.update(req.params.MENU_ID, req.body)

        res.status(200).send(update)
    } catch (error) {
        
        await utils.responseError(res,error)
    }
}
//Listo
self.status = async (req, res) => {
    try {
        //Pendiente de preguntar
        const status = await Menu.status(req.params.MENU_ID, req.body)

        res.status(200).send(status)
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.retrieve = async(req, res) => {    
    try {
        const response = await Menu.retrieve()
        res.status(200).send(response)
    } catch (error) {
        res.status(400).send(error)
    }
}
//Listo
self.get  =  async(req, res) => {    
    try {
        const menu = await Menu.get( req.params.MENU_ID )

        res.status(200).send(menu)
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.delete  =  async(req, res) => {    
    try {
        await Menu.delete(req.params.MENU_ID)

        res.status(200).send('success')

    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.order = async (req, res) => {
    try {
        await Menu.order(req.body)
        
        res.status(200).send({})
    } catch (error) {
        await utils.responseError(res,error)
    }
}
//Listo
self.count = async(req, res) => {    
    try {
        const result = await Menu.count()
        res.status(200).send({ result })
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}