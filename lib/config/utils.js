const fs = require("fs");
const self = module.exports;

self.responseError = async (res, error) => {
  let obj = error;
  if (!error.code) {
    obj = {
      code: 400,
      title: "Error",
      detail: error.message,
      suggestion: "Revisar el detalle",
    };
  }
  res.status(obj.code).send(obj);
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

// Gkey
self.resolveGkey = (business) => {
  const businessGkey = business.gkey || null;
  const hasOwnKey    = businessGkey?.status === true;

  if (hasOwnKey) return { gkey: businessGkey, source: "business" };
  return { gkey: null, source: null };
};