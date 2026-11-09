// Cookie de sesión httpOnly: opciones configurables por entorno y modo "solo cookie" por petición.
//
// Variables (todas opcionales; sin definirlas el comportamiento es idéntico a versiones anteriores):
//   IAM_COOKIE_MODE      true = sesión por cookie: el middleware lee la cookie sin cookie-parser, la cookie aplica a
//                        todo el dominio (path /) y los métodos que modifican exigen X-Auth-Mode (protección CSRF)
//   IAM_COOKIE_NAME      nombre de la cookie (token)
//   IAM_COOKIE_SAMESITE  none | lax | strict (none)
//   IAM_COOKIE_SECURE    false para http local (true)
//   IAM_COOKIE_DOMAIN    dominio compartido, ej. .bitek.mx (sin dominio = host del API)
//   IAM_COOKIE_DAYS      vigencia de la cookie en días (30)
//
// Modo solo cookie: si la petición trae el header "X-Auth-Mode: cookie", el token NO se devuelve en el cuerpo
// (el navegador lo guarda únicamente como cookie httpOnly, inaccesible para JavaScript). Sin el header (apps
// móviles, integraciones, cuentas de servicio) la respuesta sigue incluyendo el token como antes.

const self = module.exports;

const DAY_MS = 24 * 60 * 60 * 1000;

self.name = () => process.env.IAM_COOKIE_NAME || "token";
self.enabled = () => process.env.IAM_COOKIE_MODE === "true";

// Opciones comunes (las mismas para poner y para borrar; si no coinciden el navegador no la borra)
const baseOptions = () => {
  const sameSite = String(process.env.IAM_COOKIE_SAMESITE || "none").toLowerCase();
  const options = {
    httpOnly: true,
    secure: process.env.IAM_COOKIE_SECURE !== "false",
    sameSite: ["lax", "strict", "none"].includes(sameSite) ? sameSite : "none",
  };
  // Sin modo cookie se conserva la ruta por defecto de siempre (la del endpoint de login)
  if (self.enabled()) options.path = "/";
  if (process.env.IAM_COOKIE_DOMAIN) options.domain = process.env.IAM_COOKIE_DOMAIN;
  return options;
};

// true si el cliente pidió no recibir el token en el cuerpo
self.cookieOnly = (req) => self.enabled() && String((req && req.headers && req.headers["x-auth-mode"]) || "").toLowerCase() === "cookie";

// Pone la cookie de sesión y devuelve el token para el cuerpo (undefined en modo solo cookie)
self.issue = (res, token) => {
  const days = Number(process.env.IAM_COOKIE_DAYS) || 30;
  res.cookie(self.name(), token, { ...baseOptions(), expires: new Date(Date.now() + days * DAY_MS) });
  return self.cookieOnly(res.req) ? undefined : token;
};

// Cuerpo de respuesta de un inicio de sesión: en modo solo cookie reemplaza el token por session: "cookie"
self.body = (res, token, extra = {}) => {
  const bodyToken = self.issue(res, token);
  return bodyToken === undefined ? { ...extra, session: "cookie" } : { ...extra, token: bodyToken };
};

self.clear = (res) => res.clearCookie(self.name(), baseOptions());

// Token de la cookie: req.cookies (cookie-parser) como siempre; en modo cookie también el header crudo
self.read = (req) => {
  if (req.cookies && req.cookies[self.name()]) return req.cookies[self.name()];
  if (!self.enabled()) return null;
  const header = req.headers && req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === self.name()) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch (error) {
        return null;
      }
    }
  }
  return null;
};
