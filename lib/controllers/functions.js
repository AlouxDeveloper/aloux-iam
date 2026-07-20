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
        utils.responseError(res, error)
    }
}

self.update = async (req, res) => {
    try {
        const count = await Functions.exists({ _id: req.params.FUNCTION_ID })
        if (!count)
            throw new Error('Upss! No se encontró el registro')
        const payload = utils.pickFromSchema(Functions, req.body)
        payload.lastUpdate = (new Date()).getTime()
        await Functions.updateOne({ _id: req.params.FUNCTION_ID }, { $set: payload })
        res.status(200).send(payload)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.status = async (req, res) => {
    try {
        const _id = req.params.FUNCTION_ID
        const functions = await Functions.findOne({ _id })
        if (!functions)
            throw new Error('Upss! No se encontró el Elemento')
        functions.status = req.body.status
        functions.lastUpdate = (new Date()).getTime()
        const result = await functions.save()
        res.status(200).send(result)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.retrieve = async (req, res) => {
    try {
        const { page, itemsPerPage, search, status } = req.query
        const paginate = page != null && itemsPerPage != null
        let query = {}

        if (search) {
            const s = utils.escapeRegex(String(search))
            query.$or = [
                { name: { $regex: s, $options: 'i' } },
                { description: { $regex: s, $options: 'i' } }
            ]
        }

        if (status) {
            query.status = status
        }

        if (paginate) {
            const perPage = Math.min(Number(itemsPerPage), 100)
            const count = await Functions.countDocuments(query)
            const items = await Functions.find(query).skip(perPage * (Number(page) - 1)).limit(perPage).sort({ createdAt: -1 }).lean()
            const response = await utils.generatePaginationResponse(count, Number(page), perPage, items)
            const active = await Functions.countDocuments({ status: 'Activo' })
            const inactive = await Functions.countDocuments({ status: 'Inactivo' })
            response.summary = { active, inactive, total: active + inactive }
            return res.status(200).send(response)
        }

        const response = await Functions.find(query).sort({ createdAt: -1 })
        res.status(200).send(response)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.get = async (req, res) => {
    try {
        const _id = req.params.FUNCTION_ID
        const functions = await Functions.findOne({ _id }).populate([{ path: "_permissions" }, { path: "_menus" }]).lean()
        if (!functions)
            return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "Verifica el ID de la función" })
        res.status(200).send(functions)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.delete = async (req, res) => {
    try {
        const _id = req.params.FUNCTION_ID
        const response = await Functions.deleteOne({ _id })
        if (!response.deletedCount)
            return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "El registro no existe" })
        res.status(200).send({})
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.count = async (req, res) => {
    try {
        const result = await Functions.countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        utils.responseError(res, error)
    }
}
