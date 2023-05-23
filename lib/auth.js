const jwt = require('jsonwebtoken')
const User = require('./models/User')
const Permission = require('./models/Permission')

const getAccess = (user, resource) => {
    for(let i in user._functions){
        for(let j in user._functions[i]._permissions){
            if(user._functions[i]._permissions[j].status === 'Activo'){
                const permissionBack = user._functions[i]._permissions[j].method + ' ' + user._functions[i]._permissions[j].endpoint
                if(permissionBack === resource.method + ' ' + resource.endpoint){
                    return true
                }
            }
        }
    }
    return false
}

const auth = async(req, res, next) => {

    try {
        const token = req.header('Authorization').replace('Bearer ', '')

        const data = jwt.verify(token, process.env.AUTH_SECRET)
        const user = await User.findOne({ _id: data._id, 'tokens.token': token, status: 'Activo' }, {"tokens":0,pwd:0}).populate({ path: "_functions", populate: [{ path: "_permissions"}] }).lean()
        
        if (!user) {
            
            throw new Error(JSON.stringify({ 
                code: 401,
                title: 'Error de sesión',
                detail: 'Tu token no valido',
                suggestion: 'Inicia sesión nuevamente'
            }))

        }


        const resource = await Permission.findOne({ method: req.originalMethod, endpoint: req.route.path }).lean()
        if(!resource){
            throw new Error(JSON.stringify({ 
                code: 403,
                title: 'Error de recurso',
                detail: 'No se encontro  dado de alta el privilegio del endpoint: [' + req.route.path + ']',
                suggestion: 'Contacta con el admisnitrador'
            }))
        }

        if(resource.auth){
            const access = getAccess(user, resource)
            if (!access) {
                throw new Error(JSON.stringify({ 
                    code: 403,
                    title: 'Error de permisos',
                    detail: 'No cuentas con permisos para el recurso [' + resource.api +'] que: ' + resource ? resource.description : 'Recurso indefinido',
                    suggestion: 'Contacta con el admisnitrador'
                }))
            }
        }

        
        req.user = user
        req.token = token
        next()
    } catch (error) {
        const obj = JSON.parse(error.message)
        res.status(obj.code).send(obj)
    }
}

module.exports = auth