// Evita la escalada de privilegios al crear o editar usuarios.
//
// Antes, cualquiera con el permiso user.update podía asignarse la función Propietario, las compañías de otros
// clientes o acceso por API (data.apis), porque pickFromSchema deja pasar todos los campos del esquema y el
// alcance de userScope solo se aplicaba al LEER usuarios, nunca al escribirlos.
//
// Reglas (el Propietario queda exento de todas):
//   1. No puedes asignar una función cuyos permisos tú no tengas ("no otorgas lo que no tienes").
//   2. _company y _business solo pueden ser un subconjunto de los tuyos.
//   3. data.apis, data.isServiceAccount, data.internal y data.tokenLimit solo los asigna el Propietario.
//   4. No puedes cambiarte a ti mismo los campos de privilegio (incluida data.tag, la RUTA que aísla filas).
//   5. No puedes tocar a un usuario con permisos que tú no tengas (ej. un Propietario).
const Functions = require("../models/Functions");
const userScope = require("./userScope");

const self = module.exports;

const idOf = (value) => String((value && value._id) || value);
const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const forbidden = (detail, suggestion) => ({
  code: 403,
  title: "Acceso denegado",
  detail,
  suggestion: suggestion || "Solicita el cambio a un administrador con mayores permisos",
  error: new Error(),
});

// Permisos efectivos del actor: el middleware ya pobló _functions._permissions
const permissionsOf = (actor) => {
  const ids = new Set();
  for (const fn of actor?._functions || []) {
    for (const permission of fn?._permissions || []) {
      if (!permission || permission.status === "Inactivo") continue;
      ids.add(idOf(permission));
    }
  }
  return ids;
};

// Permisos que otorgan las funciones indicadas
const permissionsOfFunctions = async (functionIds) => {
  const list = asArray(functionIds).map(idOf).filter(Boolean);
  if (!list.length) return new Set();
  const fns = await Functions.find({ _id: { $in: list } }, { _permissions: 1 }).lean();
  const ids = new Set();
  for (const fn of fns) for (const permission of fn._permissions || []) ids.add(idOf(permission));
  return ids;
};

// Campos de data que solo asigna el Propietario (dan acceso o definen el aislamiento de datos)
const OWNER_ONLY_DATA = ["apis", "isServiceAccount", "internal", "tokenLimit"];
// Campos de privilegio que nadie puede cambiarse a sí mismo
const SELF_BLOCKED = ["_functions", "_company", "_business", "_client"];
const SELF_BLOCKED_DATA = ["apis", "isServiceAccount", "internal", "tokenLimit", "tag", "dashboards"];

// Valida y recorta el cuerpo de un create/update de usuario. Devuelve el cuerpo ya seguro
self.sanitizeUserBody = async (actor, body, targetUserId) => {
  const safe = { ...(body || {}) };

  // El estado del 2FA solo se cambia por las rutas de TOTP. Por el body se podía apagar
  // el segundo factor de otro usuario con data.totp = null
  if (isPlainObject(safe.data) && "totp" in safe.data) {
    safe.data = { ...safe.data };
    delete safe.data.totp;
  }

  if (userScope.isOwner(actor)) {
    // Al Propietario solo se le aplica la regla de data no-objeto, para no borrarle el objeto completo
    if ("data" in safe && !isPlainObject(safe.data)) delete safe.data;
    return safe;
  }

  const mine = permissionsOf(actor);

  // 1. No otorgar funciones con permisos que el actor no tiene
  if ("_functions" in safe) {
    const asked = await permissionsOfFunctions(safe._functions);
    const faltantes = [...asked].filter((id) => !mine.has(id));
    if (faltantes.length) {
      throw forbidden(
        `No puedes asignar una función con ${faltantes.length} permiso(s) que tu propia función no tiene`,
      );
    }
  }

  // 2. Compañías y proyectos: solo los propios
  const subset = (field, ownList) => {
    if (!(field in safe)) return;
    const own = asArray(ownList).map(idOf);
    const asked = asArray(safe[field]).map(idOf);
    const fuera = asked.filter((id) => !own.includes(id));
    if (fuera.length) throw forbidden(`No puedes asignar ${field.replace("_", "")} a los que no tienes acceso`);
  };
  subset("_company", actor?._company);
  subset("_business", actor?._business);
  subset("_client", actor?._client);

  // 3. Campos de data reservados al Propietario. Un data que no sea objeto plano (arreglo, texto, número)
  // se descarta: pickFromSchema lo escribiría tal cual y BORRARÍA todo el objeto, incluidos data.tag (la RUTA)
  // y data.totp (el 2FA)
  if ("data" in safe) {
    if (!isPlainObject(safe.data)) {
      delete safe.data;
    } else {
      safe.data = { ...safe.data };
      for (const field of OWNER_ONLY_DATA) delete safe.data[field];
    }
  }

  // 4. Nadie se cambia a sí mismo los campos de privilegio
  if (targetUserId && idOf(targetUserId) === idOf(actor?._id)) {
    for (const field of SELF_BLOCKED) delete safe[field];
    if (safe.data && typeof safe.data === "object") {
      for (const field of SELF_BLOCKED_DATA) delete safe.data[field];
    }
  }

  return safe;
};

// 5. El usuario destino debe estar en el alcance del actor y no tener más privilegios que él
self.assertCanManage = async (req, targetUser) => {
  const actor = req.user;
  if (userScope.isOwner(actor)) return targetUser;
  if (!targetUser) return targetUser;

  // Uno siempre puede actuar sobre su propia cuenta (los campos de privilegio ya quedaron bloqueados arriba)
  if (idOf(targetUser._id) === idOf(actor?._id)) return targetUser;

  // Alcance: se exige si el actor está acotado por compañía O por proyecto. Antes solo se miraba
  // la compañía, así que en un proyecto sin compañías no había alcance ninguno
  const acotado = (actor?._company || []).length || (actor?._business || []).length;
  if (acotado && !userScope.canSee(targetUser, userScope.resolve(req))) {
    throw forbidden("El usuario no pertenece a tu compañía o proyecto");
  }

  const mine = permissionsOf(actor);
  const suyos = await permissionsOfFunctions(targetUser._functions);
  const demas = [...suyos].filter((id) => !mine.has(id));
  if (demas.length) {
    throw forbidden(`No puedes administrar a un usuario con ${demas.length} permiso(s) que tú no tienes`);
  }
  return targetUser;
};
