const Functions = require('../models/Functions')
const utils = require("../config/utils");
const self = module.exports

self.create = async (req, res) => {
    try {
        const functions = new Functions(req.body)
        functions.createdAt = (new Date()).getTime()
        functions.status = 'Activo'
        await functions.save()
        res.status(201).send(functions)
    } catch (error) {
        console.log(error)
        res.status(400).send({ error: error.message })
    }
}

self.update = async (req, resp) => {
    try {
        await (new Functions(req.body)).validate()
        const count = await Functions.findOne({ _id: req.params.FUNCTION_ID }).countDocuments()
        if (!count)
            throw new Error('Upss! No se encontró el registro')
        req.body.lastUpdate = (new Date()).getTime()
        const result = await Functions.updateOne({ _id: req.params.FUNCTION_ID }, req.body)
        resp.status(200).send(req.body)
    } catch (error) {
        resp.status(400).send({ error: error.message })
    }
}
self.status = async (req, resp) => {
    try {
        const _id = req.params.FUNCTION_ID
        const functions = await Functions.findOne({ _id })
        if (!functions)
            throw new Error('Upss! No se encontró el Elemento')
        functions.status = req.body.status
        functions.lastUpdate = (new Date()).getTime()
        const result = await functions.save()
        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({ error: error.message })
    }
}
self.retrieve = async (req, res) => {
    try {
        const response = await Functions.find({}).sort({ createdAt: -1 })
        res.status(200).send(response)
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
                { name: { $regex: req.body.filter.search, $options: 'i' } },
                { description: { $regex: req.body.filter.search, $options: 'i' } }
            ];
        }

        const count = await Functions.countDocuments(query, attributes)
        let items

        if (Number(page) === 0 && Number(itemsPerPage) === 0) {
            items = await Functions.find(query, attributes)
                .sort(sort)
                .lean()
            page = 1
            itemsPerPage = count > 0 ? count : 1
        } else {
            items = await Functions.find(query, attributes)
                .skip(Number(itemsPerPage) * (Number(page) - 1))
                .limit(Number(itemsPerPage))
                .sort(sort)
                .lean()
        }

        const response = await utils.generatePaginationResponse(count, page, itemsPerPage, items)
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
}

self.get = async (req, res) => {
    try {
        const _id = req.params.FUNCTION_ID
        const functions = await Functions.findOne({ _id }).populate([{ path: "_permissions" }, { path: "_menus" }]).lean()
        if (!functions)
            res.status(404).send()
        res.status(200).send(functions)
    } catch (error) {
        res.status(400).send(error)
    }
}

self.delete = async (req, res) => {
    try {

        const _id = req.params.FUNCTION_ID
        const response = await Functions.deleteOne({ _id })
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
        let result = await Functions.find({}).countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
}