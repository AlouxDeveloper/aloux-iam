const Permission = require('../models/Permission')
const self = module.exports
//Listo
self.create = async (body) => {
        const permission = new Permission(body)
        permission.createdAt = (new Date()).getTime()
        permission.status = 'Activo'

        const create = await permission.save()

        return create
}
//preguntar
self.update = async (PERMISSION_ID, body) => {
        // await (new Permission(req.body)).validate()
        // const count = await Permission.findOne({ _id:req.params.FUNCTION_ID}, {_id: 1})
        // if(!count) {
        //     throw { code: 404, title: 'Permiso no encontrada.', detail: '', suggestion: 'Verifica que el permiso exista', error: new Error() }
        // }
        // req.body.lastUpdate = (new Date()).getTime()

        const update = await Permission.updateOne({ _id: PERMISSION_ID }, { $set: body, lastUpdate: (new Date()).getTime() })
        return update
}
//preguntar
self.status = async (PERMISSION_ID, body) => {
        // const permission = await Permission.findOne({ _id: PERMISSION_ID })
        // if(!permission) {
        //     throw { code: 404, title: 'Permiso no encontrada.', detail: '', suggestion: 'Verifica que el permiso exista', error: new Error() }
        // }

        const status = await Permission.updateOne({ _id: PERMISSION_ID }, { status: body.status, lastUpdate: (new Date()).getTime() })
        
        return status
}
//Listo
self.retrieve = async() => {

        const response = await Permission.find({}).sort({createdAt:-1}).populate('_menu')
        
        return response
}
//Listo
self.get  =  async(PERMISSION_ID) => {
        const permission = await Permission.findOne({_id: PERMISSION_ID}).populate({ path: "_menu" })
        if(!permission) {
            throw { code: 404, title: 'Permiso no encontrada.', detail: '', suggestion: 'Verifica que el permiso exista', error: new Error() }
        }

        return permission
}
//Listo
self.delete  =  async(PERMISSION_ID) => {

        const response = await Permission.deleteOne({ _id: PERMISSION_ID })
        if(!response.deletedCount) {
            throw { code: 404, title: 'Permiso no encontrada.', detail: '', suggestion: 'Verifica que el permiso exista', error: new Error() }
        }

        return response
}
//Listo
self.count = async() => {

        const result = await Permission.find({}).countDocuments()

        return result
}