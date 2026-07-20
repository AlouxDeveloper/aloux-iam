const Menu = require('../models/Menu')
const utils = require("../config/utils");
const self = module.exports

self.create = async (req, res) => {
    try {
        const menu = new Menu(req.body)
        menu.createdAt = (new Date()).getTime()
        menu.status = 'Activo'
        await menu.save()
        res.status(201).send(menu)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.update = async (req, res) => {
    try {
        const _id = req.params.MENU_ID
        const count = await Menu.exists({ _id })
        if (!count)
            throw new Error('Upss! No se encontró el registro')
        const payload = utils.pickFromSchema(Menu, req.body)
        payload.lastUpdate = (new Date()).getTime()
        await Menu.updateOne({ _id }, { $set: payload })
        res.status(200).send(payload)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.status = async (req, res) => {
    try {
        const _id = req.params.MENU_ID
        const menu = await Menu.findOne({ _id })
        if (!menu)
            throw new Error('Upss! No se encontró el Elemento')
        menu.status = req.body.status
        menu.lastUpdate = (new Date()).getTime()
        const result = await menu.save()
        res.status(200).send(result)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.retrieve = async (req, res) => {
    try {
        const { page, itemsPerPage, search, status, type } = req.query
        const paginate = page != null && itemsPerPage != null
        let query = {}

        if (search) {
            const s = utils.escapeRegex(String(search))
            query.$or = [
                { label: { $regex: s, $options: 'i' } },
                { description: { $regex: s, $options: 'i' } },
                { path: { $regex: s, $options: 'i' } }
            ]
        }

        if (status) {
            query.status = status
        }

        // No existe un campo `type` en el modelo; se deriva de `_menu`
        // (Submenú = tiene padre, Menú = no tiene padre).
        if (type === 'Submenú') {
            query._menu = { $ne: null }
        } else if (type === 'Menú') {
            query._menu = null
        }

        if (paginate) {
            const perPage = Math.min(Number(itemsPerPage), 100)
            const count = await Menu.countDocuments(query)
            const items = await Menu.find(query).skip(perPage * (Number(page) - 1)).limit(perPage).sort({ index: 1 }).lean()
            const response = await utils.generatePaginationResponse(count, Number(page), perPage, items)
            const active = await Menu.countDocuments({ status: 'Activo' })
            const inactive = await Menu.countDocuments({ status: 'Inactivo' })
            response.summary = { active, inactive, total: active + inactive }
            return res.status(200).send(response)
        }

        const consulta = await Menu.find(query).sort({ index: 1 })
        res.status(200).send(consulta)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.get = async (req, res) => {
    try {
        const _id = req.params.MENU_ID
        const menu = await Menu.findOne({ _id })
        if (!menu)
            return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "Verifica el ID del menú" })
        res.status(200).send(menu)
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.delete = async (req, res) => {
    try {
        const _id = req.params.MENU_ID
        const response = await Menu.deleteOne({ _id })
        if (!response.deletedCount)
            return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "El registro no existe" })
        res.status(200).send({})
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.order = async (req, res) => {
    try {
        if (!req.body.length)
            throw new Error('Upss! No se encontró el registro')

        for (let i in req.body) {
            const item = req.body[i]
            await Menu.updateOne({ _id: item._id }, { $set: { index: item.index } })
        }
        res.status(200).send({})
    } catch (error) {
        utils.responseError(res, error)
    }
}

self.count = async (req, res) => {
    try {
        const result = await Menu.countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        utils.responseError(res, error)
    }
}
