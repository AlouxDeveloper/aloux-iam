# Aloux IAM

Uso de esta librearía para administración de menus, privilegios, funciones, usuarios y envio de notificaciones por medio de correos y mensajes de texto

## Installation

```bash
$ npm install aloux-iam --save
```


## Usage
En archivo `init.js`

```js
// Importación
const { IAMRouter, IAMSwagger } = require('aloux-iam')

// uso
app.use(IAMRouter)

// uso swagger
app.use(
    "/aloux-iam",
    swaggerUI.serveFiles(IAMswagger, {}), 
    swaggerUI.setup(IAMswagger)
    )

// URL Swagger
// [BASE_URL]/docs-iam/#/default/

```


En archivo `router.js`

```js
// Importación
const { IAMAuth } = require('aloux-iam')

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
| DEBUG                 |   Required, para validar si el ambiente es dev o PROD |
| MASTER_PWD            |   Optional, para utilizar contraseña maestra de usuarios en desarrollo |
| BASE_URL              |   Optional, para swagger |


## Endpoints disponibles

Endpoints user self (no auth)

| Method    |   Endpoint                |   Description |
| --------- | --------------------------|---------------|
| POST      |   iam/auth/email              |   Validar correo |
| POST      |   iam/auth/login              |   Iniciar sesión |
| POST      |   iam/auth/forgot/password    |	Enviar código a correo |
| POST      |   iam/auth/validate/code      |   Verificar código |
| POST      |   iam/auth/verify/mail        |   Verificar correo |
| GET       |   iam/auth/verify/mail/token/:token  | Valida correo (Manda correo de bienvenida) |
| POST      |   iam/auth/reset/password     |   Reestablecer contraseña |
| POST      |   iam/auth/signup             |   Registrarse |


Endpoints user self

| Method    |   Endpoint                |   Description |
| --------- | --------------------------|---------------|
| GET       |	iam/auth/me                 |	Obtener información de usuario autenticado |
| PUT       |	iam/auth/profile            |	Actualizar perfil |
| PUT       |	iam/auth/profile/pictura    |	Actualizar solo la foto de perfil |
| PUT       |	iam/auth/reset/password     |	Actualizar contraseña |
| POST      |   iam/auth/send/verify/phone  |   Enviar código al teléfono de la cuenta para verificarla |
| POST      |   iam/auth/verify/phone       | Valida teléfono del usuario de la cuenta |
| POST      |	iam/auth/logout             |	Cerrar sesión |


Endpoints user

| Method    |   Endpoint                    |   Description |
| --------- | ------------------------------|----------------|
| POST      |   iam/user                    |	Crear usuario |
| GET       |	iam/user                    |	Obtener todos los usuario |
| GET       |	iam/user/:USER_ID           |	Obtener detalle de usuario |
| PUT       |	iam/user/:USER_ID           |	Actualizar usuario |
| PUT       |	iam/user/:USER_ID/status    |	Activar o desactivar usuario |
| PUT       |	iam/user/password/:USER_ID  |	Actualizar la constraseña de un usuario |
| DELETE    |	iam/user/:USER_ID           |	Eliminar usuario |
| GET       |	iam/user/count/all            |	Obtiene el número de usuarios |


Endpoints funtions

| Method    |   Endpoint                            |   Description |
| --------- | --------------------------------------|----------------|
| POST      |   iam/functions                       |   Crear función |
| PUT       |	iam/functions/:FUNCTION_ID          |	Actualizar función |
| PUT       |	iam/functions/:FUNCTION_ID/status   |	Activar o desactivar función |
| GET       |	iam/functions                       |	Obtener todas las funciones |
| GET       |	iam/functions/:FUNCTION_ID          |	Obtener detalle de la función |
| DELETE    |	iam/functions/:FUNCTION_ID          |	Eliminar función |
| GET       |	iam/functions/count/all               |	Obtiene el número de funciones |


Endpoints permission

| Method    |   Endpoint                                |   Description |
| --------- | ------------------------------------------|---------------|
| POST      |	iam/permission                          |   Crear permiso
| PUT       |	iam/permission/:PERMISSION_ID           |	Actualizar permiso |
| PUT       |	iam/permission/:PERMISSION_ID/status    |	Activar o desactivar permiso |
| GET       |	iam/permission                          |   Obtener todas los permisos |
| GET       |	iam/permission/:PERMISSION_ID           |	Obtener detalle de la permiso |
| DELETE    |	iam/permission/:PERMISSION_ID           |	Eliminar permiso |
| GET       |	iam/permission/count/all                  |	Obtiene el número de permisos |


Endpoints menu

| Method    |   Endpoint                |   Description |
| --------- | --------------------------|---------------|
| POST      |   /iam/menu               |   Crea un elemento de menú |
| PUT       |   /iam/menu/:MENU_ID           |   Actualiza un elemento de menú |
| PUT       |   /iam/menu/:MENU_ID/status    |   Activa o desactiva un menú |
| GET       |   /iam/menu               |   Obtiene todos los elementos de menú |
| GET       |   /iam/menu/:MENU_ID           |   Obtiene el detalle de un elemento de menú |
| DELETE    |   /iam/menu/:MENU_ID           |   Elimina un elemento de menú |
| POST      |   /iam/menu/order         |   Ordena los elementos de menú |
| GET       |	iam/menu/count        |	Obtiene el número de menús |


## Aloux-AWS

### Usage for files
#### Aggregate file
```js
// Importación
const { AlouxAWS } = require('aloux-iam')

// uso
// variables necesarias
/*
* AWS_REGION
* AWS_BUCKET
*/

/**
 * pathFile = folder/file_name-file_id
 * file     = req.files.property
 */
// se crea una constante para poder guardar el nuevo elemento
const result = await AlouxAWS.upload('folder/file_name' + req.files.data);

```

#### Eliminate many files
```js
// Importación
const { AlouxAWS } = require('aloux-iam')

// uso
// variables necesarias
/*
* AWS_REGION
* AWS_BUCKET
*/

/**
 * files = [{key: 'folder/file1'},{key: 'folder/file1'}]
 */
// Elimina las imagenes seleccionadas
const files = [{key: 'folder/file1'},{key: 'folder/file1'}]
const deleteImages = await AlouxAWS.delete(files)

```

#### Eliminate file
```js
// Importación
const { AlouxAWS } = require('aloux-iam')

// uso
// variables necesarias
/*
* AWS_REGION
* AWS_BUCKET
*/

/**
 * file = folder/file_name
 */
// Elimina la imagen 
const file = 'folder/file_name' + req.params.MODEL_ID
const deleteImg = await AlouxAWS.delete(file)

```

### Usage for emails
#### Send email
```js
// Importación
const { AlouxAWS } = require('aloux-iam')

// uso
// variables necesarias
/*
* AWS_REGION
* AWS_EMAIL_SENDER
*/

/**
 * email: Destination email
 * message: Mail body
 * subject: Mail subject
 */
// se crea una constante para poder guardar el nuevo elemento
const { email, message, subject } = req.body
const sendEmail = await AlouxAWS.sendCustom(email, message, subject)

```