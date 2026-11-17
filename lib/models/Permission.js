const mongoose = require("mongoose");

const permissionSchema = mongoose.Schema({
  description: { type: String, required: true, trim: true },
  method: { type: String, required: true },
  api: { type: String, required: true },
  endpoint: { type: String, required: true },
  auth: { type: Number, required: true, default: 1 },
  default: { type: Boolean },
  status: { type: String, required: true, enum: ["Activo", "Inactivo"] },
  createdAt: { type: Number },
  lastUpdate: { type: Number },
});

permissionSchema.index({ method: 1, endpoint: 1 }, { unique: true });
// auth y default definen SI se valida el rol y si la ruta queda abierta a cualquier sesión: solo deben
// cambiar desde el seed, nunca por API (un auth:0 apaga la autorización de esa ruta sin tocar ninguna función)
permissionSchema.set('nonEditable', ['method', 'endpoint', 'auth', 'default']);

const Permission = mongoose.model("Permission", permissionSchema);
module.exports = Permission;
