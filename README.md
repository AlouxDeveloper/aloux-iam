# Aloux SDK Identity and Access Management

Uso de esta librearía para administración de menus, privilegios, funciones, usuarios y envio de notificaciones por medio de correos y mensajes de texto

## Installation

```bash
$ npm install aloux-sdk --save
```


## Usage
En archivo `init.js`

```js
// Importación
const { IAMRouter, IAMSwagger } = require('aloux-sdk')

// uso
app.use(IAMRouter)

// uso swagger
app.use(
    "/aloux-sdk",
    swaggerUI.serveFiles(IAMswagger, {}), 
    swaggerUI.setup(IAMswagger)
    )

// URL Swagger
// [BASE_URL]/docs-iam/#/default/

```


En archivo `router.js`

```js
// Importación
const { IAMAuth } = require('aloux-sdk')

// uso (ejemplo)
router.post('/customer', IAMAuth, customer.create)
```

## Variables de entorno

Requiere las siguientes variables de entorno (.env)

| Variable              |   Description |
| ----------------------|---------------|
| AUTH_SECRET           |   Required, para cifrar la contraseña |
| AWS_SECRET_ACCESS_KEY |   Required, para acceso a S3 y SES AWS. |
| AWS_ACCESS_KEY_ID     |   Required, para acceso a S3 y SES AWS. |
| AWS_REGION            |   Required, para acceso a S3 y SES AWS. |
| AWS_BUCKET            |   Required, para guardar la foto de perfil en AWS. |
| AWS_EMAIL_SENDER      |   Required, para mandar el correo de recuperación de contraseña |
| BASE_URL              |   Optional, para swagger |


## Endpoints disponibles

Endpoints user self (no auth)

| Method    |   Endpoint                |   Description |
| --------- | --------------------------|---------------|
| POST      |   iam/user/email              |   Validar correo |
| POST      |   iam/user/login              |   Iniciar sesión |
| POST      |   iam/user/forgot/password    |	Enviar código a correo |
| POST      |   iam/user/validate/code      |   Verificar código |
| POST      |   iam/user/reset/password     |   Reestablecer contraseña |


Endpoints user self

| Method    |   Endpoint                |   Description |
| --------- | --------------------------|---------------|
| GET       |	iam/user/me                 |	Obtener información de usuario autenticado |
| PUT       |	iam/user/profile            |	Actualizar perfil |
| PUT       |	iam/user/profile/pictura    |	Actualizar solo la foto de perfil |
| PUT       |	iam/user/reset/password     |	Actualizar contraseña |
| GET       |	iam/user/logout             |	Cerrar sesión |


Endpoints user

| Method     |   Endpoint                    |   Description |
| --------- | ------------------------------|----------------|
| POST      |   iam/user                    |	Crear usuario |
| GET       |	iam/user                    |	Obtener todos los usuario |
| GET       |	iam/user/:USER_ID           |	Obtener detalle de usuario |
| PUT       |	iam/user/:USER_ID           |	Actualizar usuario |
| PUT       |	iam/user/active/:USER_ID    |	Activar o desactivar usuario |
| PUT       |	iam/user/password/:USER_ID  |	Actualizar la constraseña de un usuario |
| DELETE    |	iam/user/:USER_ID           |	Eliminar usuario |


Endpoints funtions

| Method     |   Endpoint                            |   Description |
| --------- | --------------------------------------|----------------|
| POST      |   iam/functions                       |   Crear función |
| PUT       |	iam/functions/:FUNCTION_ID          |	Actualizar función |
| PUT       |	iam/functions/active/:FUNCTION_ID   |	Activar o desactivar función |
| GET       |	iam/functions                       |	Obtener todas las funciones |
| GET       |	iam/functions/:FUNCTION_ID          |	Obtener detalle de la función |
| DELETE    |	iam/functions/:FUNCTION_ID          |	Eliminar función |


Endpoints permission

| Method    |   Endpoint                                |   Description |
| --------- | ------------------------------------------|---------------|
| POST      |	iam/permission                          |   Crear permiso
| PUT       |	iam/permission/:PERMISSION_ID           |	Actualizar permiso |
| PUT       |	iam/permission/active/:PERMISSION_ID    |	Activar o desactivar permiso |
| GET       |	iam/permission                          |   Obtener todas los permisos |
| GET       |	iam/permission/:PERMISSION_ID           |	Obtener detalle de la permiso |
| DELETE    |	iam/permission/:PERMISSION_ID           |	Eliminar permiso |


Endpoints menu

| Method    |   Endpoint                |   Description |
| --------- | --------------------------|---------------|
| POST      |   /iam/menu               |   Crea un elemento de menú |
| PUT       |   /iam/menu/:id           |   Actualiza un elemento de menú |
| PUT       |   /iam/menu/active/:id    |   Activa o desactiva un menú |
| GET       |   /iam/menu               |   Obtiene todos los elementos de menú |
| GET       |   /iam/menu/:id           |   Obtiene el detalle de un elemento de menú |
| DETELE    |   /iam/menu/:id           |   Elimina un elemento de menú |
| POST      |   /iam/menu/order         |   Ordena los elementos de menú |