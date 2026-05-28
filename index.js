const REQUIRED_ENV = ['AUTH_SECRET', 'SESSION_TIME'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  throw new Error(`[aloux-iam] Variables de entorno requeridas faltantes: ${missingEnv.join(', ')}`);
}

const IAMrouter = require("./lib/router");
const IAMauth = require("./lib/middleware");
const historyAloux = require("./lib/controllers/history");
const providers = require("./lib/providers");
const jsyaml = require("js-yaml");
const path = require("path");
const fs = require("fs");

const User = require("./lib/models/User");
const Functions = require("./lib/models/Functions");
const Permission = require("./lib/models/Permission");
const Menu = require("./lib/models/Menu");
const Business = require("./lib/models/Business");

// swagger
const swagger_path = path.resolve(__dirname, "./lib/swagger.yaml");
const swagger = jsyaml.load(fs.readFileSync(swagger_path, "utf8"));

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

  AlouxHistory: historyAloux,

  init: (p = {}) => providers.set(p),
};
