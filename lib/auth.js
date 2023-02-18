const jwt = require('jsonwebtoken')
const Admin = require('./models/Admin')

const getPermission = (admin) => {
    let result = []
    for(let i in admin._functions){
        for(let j in admin._functions[i]._permission){
            if(admin._functions[i]._permission[j].isActive)
            result.push(admin._functions[i]._permission[j].api)
        }
    }
    return result
}

const auth = async(req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')

        const data = jwt.verify(token, process.env.AUTH_SECRET)
        const admin = await Admin.findOne({ _id: data._id, 'tokens.token': token, isActive: true }, {"tokens":0,pwd:0}).populate({ path: "_functions", populate: [{ path: "_permission"}] })
        admin.permission = getPermission(admin)

        if (!admin) {
            throw new Error()
        }
        
        req.admin = admin
        req.token = token
        next()
    } catch (error) {
        res.status(401).send({ error: 'Not authorized to access this resource' })
    }
}

module.exports = auth