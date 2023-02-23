const jwt = require('jsonwebtoken')
const User = require('./models/User')

const getPermission = (user) => {
    let result = []
    for(let i in user._functions){
        for(let j in user._functions[i]._permission){
            if(user._functions[i]._permission[j].isActive)
            result.push(user._functions[i]._permission[j].api)
        }
    }
    return result
}

const auth = async(req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')

        const data = jwt.verify(token, process.env.AUTH_SECRET)
        const user = await User.findOne({ _id: data._id, 'tokens.token': token, isActive: true }, {"tokens":0,pwd:0}).populate({ path: "_functions", populate: [{ path: "_permission"}] })
        user.permission = getPermission(user)

        if (!user) {
            throw new Error()
        }
        
        req.user = user
        req.token = token
        next()
    } catch (error) {
        res.status(401).send({ error: 'Not authorized to access this resource' })
    }
}

module.exports = auth