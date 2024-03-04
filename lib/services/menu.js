const Menu = require('../models/Menu')
const self = module.exports
//Listo
self.create = async (body) => {
    const menu = new Menu(body)
    menu.createdAt = (new Date()).getTime()
    menu.status = 'Activo'

    const create = await menu.save()

    return create
}
//Falta
self.update = async (MENU_ID, body) => {
    // await (new Menu(req.body)).validate()
    // const menuFind = await Menu.findOne({_id: req.params.MENU_ID}, {_id: 1})
    // if(!menuFind) {
    //     throw { code: 404, title: 'Menú no encontrado.', detail: '', suggestion: 'Verifica que el menú exista', error: new Error() }
    // }
    // req.body.lastUpdate = (new Date()).getTime()

    const update = await Menu.updateOne({_id: MENU_ID}, { $set: body, lastUpdate: (new Date()).getTime() })

    return update
}
//Pendiente preguntar
self.status = async (MENU_ID, body) => {
    // const menu = await Menu.findOne({ _id: req.params.MENU_ID })
    // if(!menu){
    //     throw { code: 404, title: 'Menú no encontrado.', detail: '', suggestion: 'Verifica que el menú exista', error: new Error() }
    // }
    // menu.lastUpdate = (new Date()).getTime()

    const status = await Menu.updateOne({ _id: MENU_ID }, { status: body.status, lastUpdate: (new Date()).getTime() })
        
    return status
}
//Listo
self.retrieve = async() => {
    const response = await Menu.find({}).sort({index:1})
        
    return response
}
//Listo
self.get  =  async(MENU_ID) => {
    const menu = await Menu.findOne({_id: MENU_ID})

    if(!menu) {
        throw { code: 404, title: 'Menú no encontrado.', detail: '', suggestion: 'Verifica que el menú exista', error: new Error() }
    }

    return menu
}
//Listo
self.delete  =  async(MENU_ID) => {
    const response = await Menu.deleteOne({ _id: MENU_ID })
    if(!response.deletedCount) {
        throw { code: 404, title: 'Menú no encontrado.', detail: '', suggestion: 'Verifica que el menú exista', error: new Error() }
    }
    
    return response
}
//Listo
self.order = async (body) => {
    if(!body.length){
        throw { code: 404, title: 'Menú no encontrado.', detail: '', suggestion: 'Verifica que el menú exista', error: new Error() }
    }
            

    for(let i in body){
        const item = body[i]
        await Menu.updateOne({ _id:item._id }, { $set: { index: item.index } })
    }
}
//Listo
self.count = async() => {

    const result = await Menu.find({}).countDocuments()

    return result
}