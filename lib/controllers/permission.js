const Permission = require('../models/Permission')
const utils = require("../config/utils");
const self = module.exports

self.create = async (req, res) => {
    try {
        const permission = new Permission(req.body)
        permission.createdAt = (new Date()).getTime()
        permission.status = 'Activo'
        await permission.save()
        res.status(201).send(permission)
    } catch (error) {
        switch (error.code) {
            case 11000: obj = { error: 'El campo ' + JSON.stringify(error.keyValue) + ' ya se encuentra dado de alta', suggestion: 'Revisa la información e intenta nuevamente.' }; break
            default: obj = error
        }
        res.status(400).send(obj)
    }
}

self.update = async (req, resp) => {
    try {
        await (new Permission(req.body)).validate()
        const _id = req.params.PERMISSION_ID
        const count = await Permission.findOne({ _id }).countDocuments()
        if (!count)
            throw new Error('Upss! No se encontró el registro')
        req.body.lastUpdate = (new Date()).getTime()
        const result = await Permission.updateOne({ _id }, req.body)
        resp.status(200).send(req.body)
    } catch (error) {
        resp.status(400).send({ error: error.message })
    }
}
self.status = async (req, resp) => {
    try {
        const _id = req.params.PERMISSION_ID
        const user = await Permission.findOne({ _id })
        if (!user)
            throw new Error('Upss! No se encontró el Elemento')
        user.status = req.body.status
        user.lastUpdate = (new Date()).getTime()
        const result = await user.save()

        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({ error: error.message })
    }
}
self.retrieve = async (req, res) => {
    try {
        const consulta = await Permission.find({}).sort({ createdAt: -1 })
        res.status(200).send(consulta)
    } catch (error) {
        res.status(400).send(error)
    }
}

self.retrievePages = async (req, res) => {
    try {
        let { page = 1, itemsPerPage = 10, sort = { createdAt: -1 } } = req.body.config || {}
        let query = {}
        let attributes = { pwd: 0, tokens: 0 }

        if (req?.body?.filter?.search) {
            query.$or = [
                { description: { $regex: req.body.filter.search, $options: 'i' } },
                { method: { $regex: req.body.filter.search, $options: 'i' } },
                { api: { $regex: req.body.filter.search, $options: 'i' } },
                { endpoint: { $regex: req.body.filter.search, $options: 'i' } }
            ];
        }

        const count = await Permission.countDocuments(query)
        let items

        if (Number(page) === 0 && Number(itemsPerPage) === 0) {
            items = await Permission.find(query, attributes)
                .sort(sort)
                .lean()
            page = 1
            itemsPerPage = count > 0 ? count : 1
        } else {
            items = await Permission.find(query, attributes)
                .skip(Number(itemsPerPage) * (Number(page) - 1))
                .limit(Number(itemsPerPage))
                .sort(sort)
                .lean()
        }

        const response = await utils.generatePaginationResponse(count, page, itemsPerPage, items)
        const active = await Permission.countDocuments({ status: "Activo" })
        const inactive = await Permission.countDocuments({ status: "Inactivo" })

        response.summary = {
            active,
            inactive,
            total: active + inactive
        }
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
}

self.get = async (req, res) => {
    try {
        const _id = req.params.PERMISSION_ID
        const permission = await Permission.findOne({ _id })
        if (!permission)
            res.status(404).send()
        res.status(200).send(permission)
    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
}

self.delete = async (req, res) => {
    try {
        const _id = req.params.PERMISSION_ID
        const response = await Permission.deleteOne({ _id })
        if (!response.deletedCount)
            res.status(404).send({ error: "El registro no existe" })
        else
            res.status(200).send({})
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}

self.count = async (req, res) => {
    try {
        let result = await Permission.find({}).countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}