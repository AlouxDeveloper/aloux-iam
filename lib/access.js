
const access = async(req, res, next) => {
    
    try {
        const admin = req.admin
        const api =  req.originalMethod + req.route.path 

        const permission = admin.permission.find(function(item) {
            return item === api
        })
        if (!permission) {
            throw new Error()
        }
        next()
    } catch (error) {
        res.status(401).send({ error: 'Not authorized to access this resource' })
    }

}
module.exports = access