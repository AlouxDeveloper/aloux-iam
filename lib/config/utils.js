const fs = require("fs");
const self = module.exports;

self.responseError = (res, error, defaultCode, defaultTitle, defaultSuggestion) => {
  let code, title, detail, suggestion;

  if (error && typeof error.code === "number") {
    code       = error.code;
    title      = error.title      || "Error";
    detail     = typeof error.detail === "string" ? error.detail : "";
    suggestion = error.suggestion || "Revisa el detalle";
  } else {
    code       = defaultCode       || 400;
    title      = defaultTitle      || "Error";
    detail     = error?.message    || "";
    suggestion = defaultSuggestion || "Revisa el detalle";
  }

  res.status(code).send({ code, title, detail, suggestion });
};

self.generatePaginationResponse = async (count, page, itemsPerPage, items) => {
  const totalPages = Math.ceil(count / itemsPerPage);
  const currentPage = Math.max(1, Math.min(Number(page), totalPages));
  const finalCurrentPage = totalPages === 0 ? 1 : currentPage;
  const remainingPages = Math.max(0, totalPages - finalCurrentPage);
  return { currentPage: finalCurrentPage, totalPages, perPage: Number(itemsPerPage), count, remainingPages, items };
};

self.brand = {
  _cfg: null,

  init(config) {
    this._cfg = config;
  },

  _get(key) {
    if (this._cfg) return this._cfg[key];
    const APP = process.env.APP;
    if (APP) return process.env[`${key}_${APP}`] || process.env[key];
    return process.env[key];
  },

  name() {
    return this._get("PROJECT_NAME");
  },

  template(key) {
    const path = this._get(key);
    if (!path) {
      throw {
        code: 500,
        title: "Error de configuración",
        detail: `Template no encontrado: ${key}`,
        suggestion: "Verifica que la variable de entorno esté definida",
        error: new Error(),
      };
    }
    try {
      let file = fs.readFileSync(path, "utf8");
      file = file.replace(/\+\+\+brandName\+\+\+/g, this.name() || "");
      file = file.replace(/\+\+\+brandColor\+\+\+/g, this._get("BRAND_COLOR") || "");
      file = file.replace(/\+\+\+brandLogo\+\+\+/g, this._get("BRAND_LOGO") || "");
      return file;
    } catch (e) {
      throw {
        code: 500,
        title: "Error al leer template",
        detail: `No se pudo leer el archivo: ${path}`,
        suggestion: "Verifica que el path del template sea correcto",
        error: e,
      };
    }
  },
};

// Orden de un listado desde ?sortBy=campo&sortDesc=true. allowed mapea el nombre que manda el cliente (columna
// de la tabla) al campo real; un sortBy no permitido usa el orden por defecto. Siempre desempata por _id.
self.sortSpec = (sortBy, sortDesc, allowed, fallback) => {
  const field = sortBy && Object.prototype.hasOwnProperty.call(allowed, sortBy) ? allowed[sortBy] : null;
  if (!field) return { ...fallback, _id: 1 };
  const desc = sortDesc === true || sortDesc === 'true' || sortDesc === '1';
  return { [field]: desc ? -1 : 1, _id: 1 };
};

// Orden alfabético en español sin distinguir mayúsculas ni acentos
self.sortCollation = { locale: 'es', strength: 1 };

// Texto plano de una entrada del cliente: si llega un objeto ({"$ne": null}) devuelve "" en vez de dejar que
// Mongo lo interprete como operador y convierta una igualdad en una consulta que coincide con cualquier documento
self.asText = (value) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

// Longitud mínima de contraseña (PWD_MIN_LENGTH, 8 por defecto). Solo se exige al crear o cambiar contraseña
self.assertPasswordPolicy = (pwd) => {
  const min = parseInt(process.env.PWD_MIN_LENGTH, 10) || 8;
  if (typeof pwd !== "string" || pwd.length < min) {
    throw {
      code: 400,
      title: "Contraseña insegura",
      detail: `La contraseña debe tener al menos ${min} caracteres`,
      suggestion: "Usa una contraseña más larga",
      error: new Error(),
    };
  }
};

self.escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Sanitiza un objeto de filtros del cliente: solo permite keys sin $ y valores primitivos o anidados seguros
self.sanitizeFilters = (obj, depth = 0) => {
  if (depth > 4 || obj === null || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const safe = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && !Array.isArray(val)) {
      const nested = self.sanitizeFilters(val, depth + 1);
      if (Object.keys(nested).length > 0) safe[key] = nested;
    } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      safe[key] = val;
    }
  }
  return safe;
};

self.hashToken = (token) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

self.hashCode = (code) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(code)).digest('hex');
};

// Aplana un objeto a dot-notation completa y recursiva (data.a.b.c: valor),
// para que $set solo toque esa ruta puntual y no borre el resto. Los arrays
// se dejan tal cual (se reemplazan completos, no tiene sentido "mergear"
// por índice).
const flattenToDotNotation = (obj, prefix, result) => {
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      flattenToDotNotation(val, path, result);
    } else {
      result[path] = val;
    }
  }
  return result;
};

// Extrae del body solo los campos definidos en el schema del modelo.
// Campos de tipo Object libre (ej. data) se aplanan a dot-notation completa
// para que $set haga merge en lugar de reemplazar el objeto completo.
self.pickFromSchema = (Model, body) => {
  const nonEditable = new Set(Model.schema.options.nonEditable || []);
  const BASE_BLOCKED = new Set(['_id', '__v', 'createdAt', 'lastUpdate']);
  const schemaObj = Model.schema.obj;
  const allowed = Object.keys(schemaObj).filter(k => !BASE_BLOCKED.has(k) && !nonEditable.has(k));

  const result = {};
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    const fieldDef = schemaObj[k];
    const isFreeField = fieldDef === Object || fieldDef?.type === Object;
    const isPlainObject = v && typeof v === 'object' && !Array.isArray(v);
    if (isFreeField) {
      // Un campo de tipo Object libre solo se acepta como objeto plano. Un arreglo, un texto o un
      // número se escribirían tal cual y borrarían el objeto completo (ej. data.tag, data.totp)
      if (!isPlainObject) continue;
      flattenToDotNotation(v, k, result);
    } else {
      result[k] = v;
    }
  }
  return result;
};

self.sanitizeSort = (sort, allowedFields) => {
  if (!sort || typeof sort !== 'object' || Array.isArray(sort)) return null;
  const safe = {};
  for (const [key, val] of Object.entries(sort)) {
    const n = Number(val);
    if (allowedFields.includes(key) && (n === 1 || n === -1)) safe[key] = n;
  }
  return Object.keys(safe).length > 0 ? safe : null;
};

// Gkey
self.resolveGkey = (business) => {
  const businessGkey = business.gkey || null;
  const hasOwnKey    = businessGkey?.status === true;

  if (hasOwnKey) return { gkey: businessGkey, source: "business" };
  return { gkey: null, source: null };
};