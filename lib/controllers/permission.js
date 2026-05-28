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
        if (error.code === 11000) {
            return utils.responseError(res, {
                code: 409,
                title: "Duplicado",
                detail: "El campo " + JSON.stringify(error.keyValue) + " ya se encuentra dado de alta",
                suggestion: "Revisa la información e intenta nuevamente."
            })
        }
        utils.responseError(res, error)
    }
}

self.update = async (req, res) => {
    try {
        const _id = req.params.PERMISSION_ID
        const count = await Permission.exists({ _id })
        if (!count)
            throw new Error('Upss! No se encontró el registro')
        req.body.lastUpdate = (new Date()).getTime()
        await Permission.updateOne({ _id }, { $set: req.body })
        res.status(200).send(req.body)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.status = async (req, res) => {
    try {
        const _id = req.params.PERMISSION_ID
        const permission = await Permission.findOne({ _id })
        if (!permission)
            throw new Error('Upss! No se encontró el Elemento')
        permission.status = req.body.status
        permission.lastUpdate = (new Date()).getTime()
        const result = await permission.save()
        res.status(200).send(result)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.retrieve = async (req, res) => {
    try {
        const { page, itemsPerPage, search } = req.query
        const paginate = page != null && itemsPerPage != null
        let query = {}

        if (search) {
            const s = utils.escapeRegex(String(search))
            query.$or = [
                { description: { $regex: s, $options: 'i' } },
                { method: { $regex: s, $options: 'i' } },
                { api: { $regex: s, $options: 'i' } },
                { endpoint: { $regex: s, $options: 'i' } }
            ]
        }

        if (paginate) {
            const perPage = Math.min(Number(itemsPerPage), 100)
            const count = await Permission.countDocuments(query)
            const items = await Permission.find(query).skip(perPage * (Number(page) - 1)).limit(perPage).sort({ createdAt: -1 }).lean()
            const response = await utils.generatePaginationResponse(count, Number(page), perPage, items)
            const active = await Permission.countDocuments({ status: 'Activo' })
            const inactive = await Permission.countDocuments({ status: 'Inactivo' })
            response.summary = { active, inactive, total: active + inactive }
            return res.status(200).send(response)
        }

        const consulta = await Permission.find(query).sort({ createdAt: -1 })
        res.status(200).send(consulta)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.get = async (req, res) => {
    try {
        const _id = req.params.PERMISSION_ID
        const permission = await Permission.findOne({ _id })
        if (!permission)
            return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "Verifica el ID del permiso" })
        res.status(200).send(permission)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.delete = async (req, res) => {
    try {
        const _id = req.params.PERMISSION_ID
        const response = await Permission.deleteOne({ _id })
        if (!response.deletedCount)
            return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "El registro no existe" })
        res.status(200).send({})
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.count = async (req, res) => {
    try {
        const result = await Permission.countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        utils.responseError(res, error)
    }
}
