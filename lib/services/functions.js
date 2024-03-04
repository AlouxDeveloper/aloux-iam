const Functions = require('../models/Functions')
const self = module.exports
//Listo
self.create = async (body) => {
    const functions = new Functions(body)
    functions.status = 'Activo'
    functions.createdAt = (new Date()).getTime()

    const create = await functions.save()

    return create
}
//Falta
self.update = async (FUNCTION_ID, body) => {
    // await (new Functions(req.body)).validate()
    // const functionFind = await Functions.findOne({_id:req.params.FUNCTION_ID}, {_id: 1})
    // if(!functionFind) {
    //     throw { code: 404, title: 'Función no encontrada.', detail: '', suggestion: 'Verifica que la función exista', error: new Error() }
    // }
    // req.body.lastUpdate = (new Date()).getTime()

    const update = await Functions.updateOne({_id: FUNCTION_ID}, { $set: body, lastUpdate: (new Date()).getTime() })
    
    return update
}
//Pendiente preguntar
self.status = async (FUNCTION_ID, body) => {

    //Pendiente de preguntar x esta validacion
    // const functions = await Functions.findOne({ _id: FUNCTION_ID })
    // if(!functions) {
    //     throw { code: 404, title: 'Función no encontrada.', detail: '', suggestion: 'Verifica que la función exista', error: new Error() }
    // }

    const status = await Functions.updateOne({ _id: FUNCTION_ID }, { status: body.status, lastUpdate: (new Date()).getTime() })
        
    return status
}
//Listo
self.retrieve = async() => {    
    
    const response = await Functions.find({}).sort({ createdAt:-1 })

    return response
    
}
//Listo
self.get  =  async(FUNCTION_ID) => { 

    const functions = await Functions.findOne({ _id: FUNCTION_ID }).populate([{ path: "_permissions" },{ path: "_menus" }]).lean()
    if(!functions) {
        throw { code: 404, title: 'Función no encontrada.', detail: '', suggestion: 'Verifica que la función exista', error: new Error() }
    }

    return functions
}
//Listo
self.delete  =  async(FUNCTION_ID) => {

    const response = await Functions.deleteOne({ _id: FUNCTION_ID })
    if(!response.deletedCount) {
        throw { code: 404, title: 'Función no encontrada.', detail: '', suggestion: 'Verifica que la función exista', error: new Error() }
    }

    return response
}
//Listo
self.count = async() => {

    const result = await Functions.find({}).countDocuments()

    return result
}