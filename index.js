const IAMrouter = require('./lib/router');
const IAMauth = require('./lib/auth')
const YAML = require('yamljs')
const path = require('path')


const User = require('./lib/models/User')
const Functions = require('./lib/models/Functions')
const Permission = require('./lib/models/Permission')
const Menu = require('./lib/models/Menu')

// swagger
const swagger_path =  path.resolve(__dirname,'./lib/swagger.yaml');
const swagger = YAML.load(swagger_path);
swagger.servers[0].url = process.env.BASE_URL


 module.exports = { 
    IAMRouter: IAMrouter, 
    IAMAuth: IAMauth, 
    IAMSwagger: swagger,

    IAMUserModel: User,
    IAMFunctionsModel: Functions,
    IAMPermissionModel: Permission,
    IAMMenuModel: Menu
}