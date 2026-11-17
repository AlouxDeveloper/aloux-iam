// Límite de intentos en memoria de la instancia, compartido por las rutas públicas de autenticación.
// No sustituye un WAF: si la API corre en varias instancias, el tope se multiplica por cada una.
const crypto = require("crypto");

const store = new Map();

const self = module.exports;

const windowMs = () => (parseInt(process.env.AUTH_RATE_WINDOW_MIN, 10) || 5) * 60 * 1000;
const maxAttempts = () => parseInt(process.env.AUTH_RATE_LIMIT, 10) || 10;

const hit = (key, now, ventana, max) => {
  const record = store.get(key);
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + ventana });
    return false;
  }
  record.count++;
  return record.count > max;
};

// Llaves de agrupación: IP siempre, más las que indique cada ruta (correo, token temporal...)
self.check = (req, res, extraKeys = []) => {
  const now = Date.now();
  const ventana = windowMs();
  const max = maxAttempts();

  // Purga de vencidos: el Map crecía sin límite
  if (store.size > 5000) {
    for (const [key, record] of store) if (now > record.resetAt) store.delete(key);
  }

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const keys = [`ip:${ip}`];
  if (email) keys.push(`email:${email}`);
  for (const extra of extraKeys) if (extra) keys.push(extra);

  let blocked = false;
  for (const key of keys) if (hit(key, now, ventana, max)) blocked = true;

  if (blocked) {
    res.status(429).send({
      code: 429,
      title: "Demasiados intentos",
      detail: "Has superado el límite de intentos permitidos.",
      suggestion: `Espera ${Math.round(ventana / 60000)} minutos antes de intentarlo nuevamente.`,
    });
    return false;
  }
  return true;
};

// Llave estable a partir de un token, sin guardarlo en claro
self.tokenKey = (prefix, token) =>
  token ? `${prefix}:${crypto.createHash("sha256").update(String(token)).digest("hex").slice(0, 32)}` : null;
