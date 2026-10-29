// Visibilidad de usuarios para quien no es Propietario:
// - Usuarios internos (data.internal = true): los da de alta el equipo para seguimiento; solo los ve el Propietario.
// - Solo usuarios de la compañía y el proyecto seleccionados (headers Company / Business); sin headers, los de sus compañías.
// - En listados, cada usuario muestra solo la compañía y el proyecto seleccionados (no sus demás asignaciones).
const OWNER_FUNCTION = "Propietario";

const self = module.exports;

const idOf = (value) => String((value && value._id) || value);
const header = (req, name) => {
  const value = req.header(name);
  return value && value !== "undefined" && value !== "null" ? String(value) : null;
};
const forbidden = (suggestion) => ({
  code: 403,
  title: "Acceso denegado",
  detail: "",
  suggestion,
});

self.isOwner = (user) => (user?._functions || []).some((fn) => fn?.name === OWNER_FUNCTION);

// Filtro Mongo de usuarios visibles (null = sin restricción, Propietario) y la selección para recortar asignaciones
self.resolve = (req) => {
  if (self.isOwner(req.user)) return { query: null, companyId: null, businessId: null };
  const companyId = header(req, "Company");
  const businessId = header(req, "Business");
  const myCompanies = (req.user?._company || []).map(idOf);
  const myBusinesses = (req.user?._business || []).map(idOf);
  if (companyId && !myCompanies.includes(companyId)) throw forbidden("No tienes acceso a esta compañía");
  if (businessId && !myBusinesses.includes(businessId)) throw forbidden("No tienes acceso a este negocio");

  const query = { "data.internal": { $ne: true } };
  query._company = companyId || { $in: req.user?._company || [] };
  if (businessId) query._business = businessId;
  return { query, companyId, businessId };
};

// Combina el filtro de visibilidad con el de la consulta (ambos deben cumplirse)
self.merge = (query, scope) => (scope.query ? { $and: [query, scope.query] } : query);

// Deja en cada usuario solo la compañía y el proyecto seleccionados
self.trim = (users, scope) => {
  if (!scope.query) return users;
  const keep = (list, id) => (Array.isArray(list) && id ? list.filter((item) => idOf(item) === id) : list);
  return users.map((user) => ({ ...user, _company: keep(user._company, scope.companyId), _business: keep(user._business, scope.businessId) }));
};

// Detalle: el usuario es visible si cumple el filtro (internos y ajenos → no visible)
self.canSee = (user, scope) => {
  if (!scope.query || !user) return true;
  if (user.data && user.data.internal) return false;
  const companies = (user._company || []).map(idOf);
  if (scope.companyId ? !companies.includes(scope.companyId) : !companies.some((id) => scope.query._company.$in.map(idOf).includes(id))) return false;
  if (scope.businessId && !(user._business || []).map(idOf).includes(scope.businessId)) return false;
  return true;
};
