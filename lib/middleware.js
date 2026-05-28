const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Permission = require("./models/Permission");
const historyController = require("./controllers/history");
const { hashToken } = require("./config/utils");

const getAccess = (user, resource) => {
  // Cuenta de servicio: verifica acceso por api asignada
  const userApis = user?.data?.apis || [];
  if (userApis.some((apiId) => apiId.toString() === resource._id.toString())) {
    return true;
  }

  // Flujo normal: verifica permisos por función/rol
  for (let i in user._functions) {
    for (let j in user._functions[i]._permissions) {
      if (user._functions[i]._permissions[j].status === "Activo") {
        const permissionBack =
          user._functions[i]._permissions[j].method +
          " " +
          user._functions[i]._permissions[j].endpoint;
        if (permissionBack === resource.method + " " + resource.endpoint) {
          return true;
        }
      }
    }
  }
  return false;
};

const auth = async (req, res, next) => {
  try {
    let newHistory;
    if (process.env.HISTORY === "true") {
      const endpoints = process.env.HISTORY_ENDPOINTS.split(",");
      const urlToCheck = req.route.path;
      if (endpoints.includes(urlToCheck)) {
        newHistory = await historyController.create(req);
        req.history = newHistory._id.toString();
      }
    }

    let token =
      req.header("Authorization") || (req.cookies && req.cookies.token);

    if (!token) {
      throw {
        code: 401,
        title: "Error de autenticación",
        detail: "Endpoint requiere token",
        suggestion: "Vuelve a iniciar sesion",
        error: new Error(),
      };
    }

    token = token.replace("Bearer ", "");

    const data = jwt.verify(token, process.env.AUTH_SECRET);
    const tokenH = hashToken(token);
    const sessionActive = process.env.SESSION_INTERRUPTOR === "true";
    const user = await User.findOne(
      { _id: data._id, "tokens.token": tokenH, status: "Activo" },
      sessionActive ? { pwd: 0 } : { tokens: 0, pwd: 0 },
    )
      .populate({ path: "_functions", populate: [{ path: "_permissions" }] })
      .lean();

    if (!user) {
      throw {
        code: 401,
        title: "Error de autenticación",
        detail: "No se encontró el usuario",
        suggestion: "Vuelve a iniciar sesion",
        error: new Error(),
      };
    }

    if (sessionActive) {
      const tokenObject = user.tokens.find((t) => t.token === tokenH);
      if (tokenObject.dateEnd <= Date.now()) {
        await User.updateOne(
          { _id: user._id },
          { $pull: { tokens: { token: tokenObject.token } } },
        );
        throw {
          code: 401,
          title: "La sesión expiró",
          detail: "Has llegado al tiempo límite de tu sesión",
          suggestion: "Se eliminó la sesión vencida",
          error: new Error(),
        };
      }
    }

    const resource = await Permission.findOne({
      method: req.method,
      endpoint: req.route.path,
    }).lean();
    if (!resource) {
      throw {
        code: 403,
        title: "Error de recurso",
        detail:
          "No se encontro  dado de alta el privilegio del endpoint: " +
          req.method +
          " " +
          req.route.path +
          " ",
        suggestion: "Contacta con el administrador",
        error: new Error(),
      };
    }

    if (resource.auth && !resource.default) {
      const access = getAccess(user, resource);
      if (!access) {
        const userApis = user?.data?.apis || [];
        throw {
          code: 403,
          title: "Acceso denegado",
          detail:
            userApis.length > 0
              ? "No cuentas con acceso a esta API"
              : "No cuentas con permisos para el recurso [" +
                resource.api +
                "] que: " +
                (resource ? resource.description : "Recurso indefinido"),
          suggestion:
            userApis.length > 0
              ? "Contacta con el administrador para asignar acceso a esta API"
              : "Contacta con el administrador",
          error: new Error(),
        };
      }
    }

    req.user = user;
    req.token = token;
    req.permission = resource ? resource.description : "Recurso indefinido";
    next();
  } catch (error) {
    let obj = error;
    if (!error.code) {
      obj = {
        code: 401,
        title: "Error de autenticación",
        detail: error.message,
        suggestion: "Vuelve a iniciar sesion",
      };
    }
    res.status(obj.code).send(obj);
  }
};

module.exports = auth;
