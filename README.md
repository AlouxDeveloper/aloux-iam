# aloux-iam

Librería Node.js para gestión de identidad y acceso (IAM) en APIs Express + MongoDB.

## Instalación

```bash
npm install aloux-iam
```

## Configuración básica

```js
const express     = require('express')
const mongoose    = require('mongoose')
const cookieParser = require('cookie-parser')
const { IAMRouter } = require('aloux-iam')

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(IAMRouter)

mongoose.connect(process.env.MONGO_URI)
app.listen(3000)
```

### Proteger tus propias rutas

```js
const { IAMAuth } = require('aloux-iam')

app.get('/api/mi-recurso', IAMAuth, (req, res) => {
  // req.user  → usuario autenticado con funciones y permisos
  // req.token → JWT string
  res.json({ user: req.user })
})
```

### Swagger

```js
const swaggerUI        = require('swagger-ui-express')
const { IAMSwagger }   = require('aloux-iam')

app.use('/docs-iam', swaggerUI.serveFiles(IAMSwagger, {}), swaggerUI.setup(IAMSwagger))
```

## Integración con aloux-cloud

```js
const iam   = require('aloux-iam')
const cloud = require('aloux-cloud')

iam.init({
  email:     cloud.ses,
  sms:       cloud.sns,
  storage:   cloud.s3,
  analytics: cloud.bigQuery,
})
```

Cada provider es opcional. Si no se configura, el IAM funciona sin ese servicio.

## Variables de entorno

### Requeridas

| Variable | Descripción |
|----------|-------------|
| `AUTH_SECRET` | Clave secreta para firmar JWT |
| `MONGO_URI` | URI de conexión a MongoDB |

### Sesión y autenticación

| Variable | Default | Descripción |
|----------|---------|-------------|
| `SESSION_TIME` | — | Duración del token en minutos |
| `MAX_TOKENS` | `5` | Sesiones activas simultáneas por usuario |
| `FAILED_ATTEMPS` | `5` | Intentos fallidos antes de bloquear la cuenta |
| `SESSION_INTERRUPTOR` | — | Si `true`, valida expiración en cada request |
| `SERVICE_ACCOUNT_TTL_DAYS` | permanente | Días de vida del token de cuentas de servicio |
| `DEBUG` | — | Si `true`, activa `MASTER_PWD` y URL de Swagger |
| `MASTER_PWD` | — | Contraseña maestra que omite bcrypt (requiere `DEBUG=true`) |
| `SWAGGER_SERVER` | — | URL del servidor en Swagger cuando `DEBUG=true` |

### Emails (requiere provider `email`)

| Variable | Descripción |
|----------|-------------|
| `SEND_EMAIL_USER` | Si `true`, envía credenciales al crear usuario admin |
| `SUBJECT_EMAIL` | Asunto por defecto de los emails |
| `CHANGE_PWD` | Si `true`, fuerza cambio de contraseña en primer login |
| `VERIFY_ACCOUNT_URL` | URL base para verificación de cuenta |
| `URL_VERIFY_EMAIL` | URL para confirmar cambio de email |
| `TEMPLATE_ACCOUNT` | Path al template HTML de credenciales |
| `TEMPLATE_RECOVER_PASSWORD` | Path al template HTML de recuperación |
| `TEMPLATE_VERIFY_EMAIL` | Path al template HTML de verificación |
| `TEMPLATE_WELCOME` | Path al template HTML de bienvenida |
| `TEMPLATE_CHANGE_MAIL` | Path al template HTML de cambio de email |

### Branding y multi-app

| Variable | Descripción |
|----------|-------------|
| `APP` | Identificador de app para templates con sufijo |
| `PROJECT_NAME` | Nombre de la app en templates y SMS |
| `PROJECT_URL` | URL del proyecto en SMS de verificación |
| `BRAND_COLOR` | Color principal para templates de email |
| `BRAND_LOGO` | URL del logo para templates de email |
| `FUNCTION_NAME` | Función asignada por defecto al hacer signup |

### Historial

| Variable | Descripción |
|----------|-------------|
| `HISTORY` | Si `true`, registra historial de acciones |
| `HISTORY_ENDPOINTS` | Paths separados por coma a registrar |

### Analytics (requiere provider `analytics`)

| Variable | Descripción |
|----------|-------------|
| `UPLOAD_CUSTOMER` | Si `true`, inserta nuevos usuarios en BigQuery |
| `UPLOAD_CUSTOMER_TABLE` | Tabla de BigQuery donde insertar |

## Exportaciones

| Export | Tipo | Descripción |
|--------|------|-------------|
| `IAMRouter` | Express Router | Monta todos los endpoints `/iam/*` |
| `IAMAuth` | Middleware | Autenticación JWT para tus rutas |
| `IAMSwagger` | Object | Spec OpenAPI lista para swagger-ui-express |
| `IAMUserModel` | Mongoose Model | Modelo User |
| `IAMUserBusiness` | Mongoose Model | Modelo Business |
| `IAMFunctionsModel` | Mongoose Model | Modelo Functions |
| `IAMPermissionModel` | Mongoose Model | Modelo Permission |
| `IAMMenuModel` | Mongoose Model | Modelo Menu |
| `AlouxHistory` | Service | Controlador de historial |
| `init` | Function | Registra providers de aloux-cloud |

## Flujos de creación de usuarios

### Signup público — `POST /iam/auth/signup`
El usuario se registra solo. Requiere `email` y `pwd`. Se le asigna la función definida en `FUNCTION_NAME`.

### Usuario administrado — `POST /iam/user`
Un admin crea el usuario. Requiere `email` y `pwd`. Permite asignar funciones, empresas y negocios.

### Cuenta de servicio — `POST /iam/user/service`
Sin `email` ni contraseña. Para comunicación machine-to-machine. Devuelve un API token permanente una sola vez en la respuesta.

## Endpoints

### Autenticación (sin token)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/iam/auth/email` | Verificar si un email existe |
| `POST` | `/iam/auth/login` | Iniciar sesión |
| `POST` | `/iam/auth/logo` | Logo de empresa por email |
| `POST` | `/iam/auth/forgot/password` | Enviar código de recuperación |
| `POST` | `/iam/auth/validate/code` | Validar código de recuperación |
| `POST` | `/iam/auth/reset/password` | Resetear contraseña con código |
| `POST` | `/iam/auth/verify/mail` | Enviar email de verificación de cuenta |
| `GET`  | `/iam/auth/verify/mail/token/:token` | Activar cuenta por token |
| `POST` | `/iam/auth/signup` | Registro público (requiere `pwd`) |
| `GET`  | `/iam/generatePassword` | Generar contraseña segura aleatoria |

### Autenticación (con token)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET`   | `/iam/auth/me` | Perfil del usuario autenticado |
| `PATCH` | `/iam/auth/profile` | Actualizar perfil |
| `PUT`   | `/iam/auth/profile/pictura` | Actualizar foto de perfil |
| `PUT`   | `/iam/auth/reset/password` | Cambiar contraseña |
| `POST`  | `/iam/auth/send/verify/phone` | Enviar código SMS |
| `POST`  | `/iam/auth/verify/phone` | Validar código de teléfono |
| `POST`  | `/iam/auth/logout` | Cerrar sesión (la actual) |
| `POST`  | `/iam/auth/logout-all` | Cerrar todas las sesiones |
| `GET`   | `/iam/auth/sessions` | Listar sesiones activas |
| `DELETE`| `/iam/auth/sessions/:id` | Cerrar una sesión específica |
| `PATCH` | `/iam/auth/mail` | Iniciar cambio de email |
| `POST`  | `/iam/auth/validate/mail` | Confirmar nuevo email |

### 2FA / TOTP

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET`  | `/iam/totp/setup` | Genera QR y secreto TOTP |
| `POST` | `/iam/totp/activate` | Activa 2FA tras escanear QR |
| `POST` | `/iam/totp/verify` | Verifica código TOTP en el login |

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/user` | Crear usuario administrado |
| `POST`   | `/iam/user/service` | Crear cuenta de servicio |
| `GET`    | `/iam/user` | Listar usuarios `?page&itemsPerPage&search` |
| `GET`    | `/iam/user/:USER_ID` | Obtener usuario |
| `PATCH`  | `/iam/user/:USER_ID` | Actualizar usuario |
| `PUT`    | `/iam/user/:USER_ID/status` | Cambiar estado |
| `PUT`    | `/iam/user/password/:USER_ID` | Cambiar contraseña |
| `DELETE` | `/iam/user/:USER_ID` | Eliminar usuario |
| `GET`    | `/iam/user/count/all` | Contar usuarios |
| `GET`    | `/iam/business/user` | Usuarios del negocio actual |
| `GET`    | `/iam/user/by/my/companies` | Usuarios de mis empresas |

### Funciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/functions` | Crear función |
| `GET`    | `/iam/functions` | Listar funciones |
| `GET`    | `/iam/functions/:FUNCTION_ID` | Obtener función |
| `PATCH`  | `/iam/functions/:FUNCTION_ID` | Actualizar función |
| `PUT`    | `/iam/functions/:FUNCTION_ID/status` | Cambiar estado |
| `DELETE` | `/iam/functions/:FUNCTION_ID` | Eliminar función |
| `GET`    | `/iam/functions/count/all` | Contar funciones |

### Permisos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/permission` | Crear permiso |
| `GET`    | `/iam/permission` | Listar permisos |
| `GET`    | `/iam/permission/:PERMISSION_ID` | Obtener permiso |
| `PATCH`  | `/iam/permission/:PERMISSION_ID` | Actualizar permiso |
| `PUT`    | `/iam/permission/:PERMISSION_ID/status` | Cambiar estado |
| `DELETE` | `/iam/permission/:PERMISSION_ID` | Eliminar permiso |
| `GET`    | `/iam/permission/count/all` | Contar permisos |

### Menús

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/menu` | Crear elemento |
| `GET`    | `/iam/menu` | Listar menús |
| `GET`    | `/iam/menu/:MENU_ID` | Obtener elemento |
| `PATCH`  | `/iam/menu/:MENU_ID` | Actualizar elemento |
| `PUT`    | `/iam/menu/:MENU_ID/status` | Cambiar estado |
| `POST`   | `/iam/menu/order` | Reordenar |
| `DELETE` | `/iam/menu/:MENU_ID` | Eliminar elemento |
| `GET`    | `/iam/menu/count/all` | Contar menús |

### Empresas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/company` | Crear empresa |
| `GET`    | `/iam/company` | Listar empresas |
| `GET`    | `/iam/company/my` | Mis empresas |
| `GET`    | `/iam/company/:COMPANY_ID` | Detalle |
| `PATCH`  | `/iam/company/:COMPANY_ID` | Actualizar |
| `PATCH`  | `/iam/company/:COMPANY_ID/picture` | Actualizar logo |
| `PATCH`  | `/iam/company/:COMPANY_ID/favicon` | Actualizar favicon |
| `GET`    | `/iam/company/:ID/identity` | Identidad pública |
| `PUT`    | `/iam/company/:COMPANY_ID/gkey` | Configurar Google Key |
| `DELETE` | `/iam/company/:COMPANY_ID/gkey` | Eliminar Google Key |
| `DELETE` | `/iam/company/:COMPANY_ID` | Eliminar empresa |

### Negocios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/business` | Crear negocio |
| `GET`    | `/iam/business` | Listar negocios |
| `POST`   | `/iam/business/company` | Negocios de una empresa |
| `GET`    | `/iam/business/my` | Mis negocios |
| `GET`    | `/iam/business/my/company/:COMPANY_ID` | Mis negocios por empresa |
| `GET`    | `/iam/business/:BUSINESS_ID` | Detalle |
| `PUT`    | `/iam/business/:BUSINESS_ID` | Actualizar |
| `PATCH`  | `/iam/business/:BUSINESS_ID/picture` | Actualizar logo |
| `PATCH`  | `/iam/business/:BUSINESS_ID/favicon` | Actualizar favicon |
| `GET`    | `/iam/business/:ID/identity` | Identidad pública |
| `PATCH`  | `/iam/business/:BUSINESS_ID/useCompanyKey` | Usar clave de empresa |
| `POST`   | `/iam/business/:BUSINESS_ID/inheritKey` | Heredar clave de empresa |
| `DELETE` | `/iam/business/:BUSINESS_ID` | Eliminar negocio |

### Logs, Etiquetas e Historial

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST`   | `/iam/log` | Crear log |
| `POST`   | `/iam/log/retrieve` | Recuperar logs con filtros y analytics |
| `GET`    | `/iam/log/:LOG_ID` | Obtener log |
| `PATCH`  | `/iam/log/:LOG_ID` | Actualizar log |
| `PUT`    | `/iam/log/:LOG_ID/status` | Cambiar estado |
| `DELETE` | `/iam/log/:LOG_ID` | Eliminar log |
| `GET`    | `/iam/log/count/all` | Contar logs |
| `POST`   | `/iam/label` | Crear etiqueta |
| `GET`    | `/iam/label` | Listar etiquetas |
| `POST`   | `/iam/retrieve/history` | Listar historial |
| `GET`    | `/iam/history/:HISTORY_ID` | Detalle de historial |

## Respuesta de error estándar

Todos los errores del IAM devuelven siempre la misma estructura:

```json
{
  "code":       400,
  "title":      "Título del error",
  "detail":     "Descripción detallada",
  "suggestion": "Qué hacer para resolverlo"
}
```

## Licencia

MIT
