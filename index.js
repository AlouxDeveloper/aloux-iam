const IAMrouter = require('./lib/router')
const IAMauth = require('./lib/middleware')
const awsAloux = require('./lib/controllers/operationsAWS')
const YAML = require('yamljs')
const path = require('path')


const User = require('./lib/models/User')
const Functions = require('./lib/models/Functions')
const Permission = require('./lib/models/Permission')
const Menu = require('./lib/models/Menu')

// swagger
const swagger_path = path.resolve(__dirname, './lib/swagger.yaml')
const swagger = YAML.load(swagger_path)

if (process.env.DEBUG === 'true') {
    swagger['servers'] = []
    swagger.servers.push({ url: process.env.SWAGGER_SERVER, description: 'DEV' })
}


module.exports = {
    IAMRouter: IAMrouter,
    IAMAuth: IAMauth,
    IAMSwagger: swagger,

    IAMUserModel: User,
    IAMFunctionsModel: Functions,
    IAMPermissionModel: Permission,
    IAMMenuModel: Menu,

    AlouxAWS: awsAloux
}