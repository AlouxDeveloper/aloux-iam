const express = require('express')
const middleware = require('./middleware.js')
const router = express.Router()

const auth           = require('./controllers/auth')
const user           = require('./controllers/user')
const menu           = require('./controllers/menu')
const permission     = require('./controllers/permission')
const functions      = require('./controllers/functions')

// User / user self (no auth)
router.post('/iam/auth/email',                     auth.email)
router.post('/iam/auth/login',                     auth.login)
router.post('/iam/auth/forgot/password',           auth.recoverpassword) 
router.post('/iam/auth/validate/code',             auth.verifyCode) 
router.post('/iam/auth/verify/mail',               auth.sendVerifyMailAccount)
router.get('/iam/auth/verify/mail/token/:token',   auth.verifyMailTokenAccount)
router.post('/iam/auth/reset/password',            auth.resetPassword)
router.post('/iam/auth/signup',                    auth.createCustomer)

// User / user self
router.get('/iam/auth/me',                          middleware, auth.me)
router.patch('/iam/auth/profile',                   middleware, auth.updateAny)
router.put('/iam/auth/profile/pictura',             middleware, auth.updatePicture)
router.put('/iam/auth/reset/password',              middleware, auth.resetPass)
router.post('/iam/auth/send/verify/phone',          middleware, auth.verifyPhone)
router.post('/iam/auth/verify/phone',               middleware, auth.validatePhone)
router.post('/iam/auth/logout',                     middleware, auth.logout)
router.patch('/iam/auth/mail',                      middleware, auth.mailChange)
router.post('/iam/auth/validate/mail',              middleware, auth.validatEmailChange)

// IAM / User
router.post('/iam/user',                            middleware, user.create)
router.get('/iam/user',                             middleware, user.retrieve)
router.get('/iam/user/:USER_ID',                    middleware, user.get)
router.patch('/iam/user/:USER_ID',                  middleware, user.update)
router.put('/iam/user/:USER_ID/status',             middleware, user.status)
router.put('/iam/user/password/:USER_ID',           middleware, user.updatepassword)
router.delete('/iam/user/:USER_ID',                 middleware, user.delete)
router.get('/iam/user/count/all',                   middleware, user.count)


// IAM / Function
router.post('/iam/functions',                       middleware, functions.create)     
router.patch('/iam/functions/:FUNCTION_ID',         middleware, functions.update)
router.put('/iam/functions/:FUNCTION_ID/status',    middleware, functions.status)
router.get('/iam/functions',                        middleware, functions.retrieve)
router.get('/iam/functions/:FUNCTION_ID',           middleware, functions.get)
router.delete('/iam/functions/:FUNCTION_ID',        middleware, functions.delete)
router.get('/iam/functions/count/all',              middleware, functions.count)


// IAM / Permission
router.post('/iam/permission',                      middleware, permission.create)     
router.patch('/iam/permission/:PERMISSION_ID',      middleware, permission.update)
router.put('/iam/permission/:PERMISSION_ID/status', middleware, permission.status)
router.get('/iam/permission',                       middleware, permission.retrieve)
router.get('/iam/permission/:PERMISSION_ID',        middleware, permission.get)
router.delete('/iam/permission/:PERMISSION_ID',     middleware, permission.delete)
router.get('/iam/permission/count/all',             middleware, permission.count)


// IAM / Menu
router.post('/iam/menu',                            middleware, menu.create)     
router.patch('/iam/menu/:MENU_ID',                  middleware, menu.update)
router.put('/iam/menu/:MENU_ID/status',             middleware, menu.status)
router.get('/iam/menu',                             middleware, menu.retrieve)
router.get('/iam/menu/:MENU_ID',                    middleware, menu.get)
router.delete('/iam/menu/:MENU_ID',                 middleware, menu.delete)
router.post('/iam/menu/order',                      middleware, menu.order)
router.get('/iam/menu/count/all',                   middleware, menu.count)


module.exports = router