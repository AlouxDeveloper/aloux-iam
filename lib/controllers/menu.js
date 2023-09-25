const Menu = require('../models/Menu')
const self = module.exports

self.create = async (req, res) => {
    try {
        const menu = new Menu(req.body)
        menu.createdAt = (new Date()).getTime()
        menu.status = 'Activo'
        await menu.save()
        res.status(201).send(menu)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.update = async (req, resp) => {
    try {
        await (new Menu(req.body)).validate()
        const _id = req.params.MENU_ID
        const count = await Menu.findOne({_id}).countDocuments()
        if(!count)
            throw new Error('Upss! No se encontró el registro')
            req.body.lastUpdate = (new Date()).getTime()
        const result = await Menu.updateOne({_id}, req.body)
        resp.status(200).send(req.body)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}
self.status = async (req, resp) => {
    try {
        const _id = req.params.MENU_ID
        const user = await Menu.findOne({ _id })
        if(!user)
            throw new Error('Upss! No se encontró el Elemento')
        user.status = req.body.status
        user.lastUpdate = (new Date()).getTime()
        const result = await user.save()
        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}
self.retrieve = async(req, res) => {    
    try {
        const consulta = await Menu.find({}).sort({index:1})
        if(!consulta)
        res.status(404).send()
        res.status(200).send(consulta)
    } catch (error) {
        res.status(400).send(error)
    }
}

self.get  =  async(req, res) => {    
    try {
        const _id = req.params.MENU_ID
        const menu = await Menu.findOne({_id})
        if(!menu)
        res.status(404).send()
        res.status(200).send(menu)
    } catch (error) {
        res.status(400).send(error)
    }
}

self.delete  =  async(req, res) => {    
    try {
        const _id = req.params.MENU_ID
        const response = await Menu.deleteOne({ _id })
        if(!response.deletedCount)
            res.status(404).send({ error : "El registro no existe"})
        else
            res.status(200).send({})
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.order = async (req, resp) => {
    try {
        if(!req.body.length)
            throw new Error('Upss! No se encontró el registro')

        for(let i in req.body){
            const item = req.body[i]
            await Menu.updateOne({ _id:item._id }, { $set: { index: item.index } })
        }
        resp.status(200).send({})
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}

self.count = async(req, res) => {    
    try {
        let result = await Menu.find({}).countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}