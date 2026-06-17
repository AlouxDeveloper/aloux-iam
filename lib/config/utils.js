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

// Extrae del body solo los campos definidos en el schema del modelo.
// Campos de tipo Object libre (ej. data) se aplanan a dot-notation para que
// $set haga merge en lugar de reemplazar el objeto completo.
self.pickFromSchema = (Model, body) => {
  const nonEditable = new Set(Model.schema.options.nonEditable || []);
  const BASE_BLOCKED = new Set(['_id', '__v', 'createdAt', 'lastUpdate']);
  const schemaObj = Model.schema.obj;
  const allowed = Object.keys(schemaObj).filter(k => !BASE_BLOCKED.has(k) && !nonEditable.has(k));

  const result = {};
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    const fieldDef = schemaObj[k];
    const isFreeObject = (fieldDef === Object || fieldDef?.type === Object) &&
                         v && typeof v === 'object' && !Array.isArray(v);
    if (isFreeObject) {
      for (const [dk, dv] of Object.entries(v)) {
        result[`${k}.${dk}`] = dv;
      }
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