const IAMrouter = require("./lib/router");
const IAMauth = require("./lib/middleware");
const awsAloux = require("./lib/controllers/operationsAWS");
const historyAloux = require("./lib/controllers/history");
const awsBQ = require("./lib/services/bigQuery");
const YAML = require("yamljs");
const path = require("path");

const User = require("./lib/models/User");
const Functions = require("./lib/models/Functions");
const Permission = require("./lib/models/Permission");
const Menu = require("./lib/models/Menu");
const Business = require("./lib/models/Business");

// swagger
const swagger_path = path.resolve(__dirname, "./lib/swagger.yaml");
const swagger = YAML.load(swagger_path);

if (process.env.DEBUG === "true") {
  swagger["servers"] = [];
  swagger.servers.push({ url: process.env.SWAGGER_SERVER, description: "DEV" });
}

module.exports = {
  IAMRouter: IAMrouter,
  IAMAuth: IAMauth,
  IAMSwagger: swagger,

  IAMUserModel: User,
  IAMUserBusiness: Business,
  IAMFunctionsModel: Functions,
  IAMPermissionModel: Permission,
  IAMMenuModel: Menu,

  AlouxAWS: awsAloux,
  AlouxBQ: awsBQ,
  AlouxHistory: historyAloux,
};
