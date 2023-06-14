const express = require('express')
const auth = require('./auth.js')
const router = express.Router()

const user          = require('./controllers/user')
const menu          = require('./controllers/menu')
const permission    = require('./controllers/permission')
const functions     = require('./controllers/functions')



// User / user self (no auth)
router.post('/iam/user/email',                  user.email)
router.post('/iam/user/login',                  user.login)
router.post('/iam/user/forgot/password',        user.recoverpassword) 
router.post('/iam/user/validate/code',          user.verifyCode) 
router.post('/iam/user/reset/password',         user.resetPassword)

// User / user self
router.get('/iam/user/me',                          auth, user.me)
router.put('/iam/user/profile',                     auth, user.updateAny)
router.put('/iam/user/profile/pictura',             auth, user.updatePicture)
router.put('/iam/user/reset/password',              auth, user.resetPass)
router.post('/iam/user/logout',                     auth, user.logout)


// IAM / User
router.post('/iam/user',                            auth, user.create)
router.get('/iam/user',                             auth, user.retrieve)
router.get('/iam/user/:USER_ID',                    auth, user.get)
router.patch('/iam/user/:USER_ID',                  auth, user.update)
router.put('/iam/user/:USER_ID/status',             auth, user.status)
router.put('/iam/user/password/:USER_ID',           auth, user.updatepassword)
router.delete('/iam/user/:USER_ID',                 auth, user.delete)
router.get('/iam/user/count/all',                   auth, user.count)


// IAM / Function
router.post('/iam/functions',                       auth, functions.create)     
router.patch('/iam/functions/:FUNCTION_ID',         auth, functions.update)
router.put('/iam/functions/:FUNCTION_ID/status',    auth, functions.status)
router.get('/iam/functions',                        auth, functions.retrieve)
router.get('/iam/functions/:FUNCTION_ID',           auth, functions.get)
router.delete('/iam/functions/:FUNCTION_ID',        auth, functions.delete)
router.get('/iam/functions/count/all',              auth, functions.count)


// IAM / Permission
router.post('/iam/permission',                      auth, permission.create)     
router.patch('/iam/permission/:PERMISSION_ID',      auth, permission.update)
router.put('/iam/permission/:PERMISSION_ID/status', auth, permission.status)
router.get('/iam/permission',                       auth, permission.retrieve)
router.get('/iam/permission/:PERMISSION_ID',        auth, permission.get)
router.delete('/iam/permission/:PERMISSION_ID',     auth, permission.delete)
router.get('/iam/permission/count/all',             auth, permission.count)


// IAM / Menu
router.post('/iam/menu',                            auth, menu.create)     
router.patch('/iam/menu/:MENU_ID',                  auth, menu.update)
router.put('/iam/menu/:MENU_ID/status',             auth, menu.status)
router.get('/iam/menu',                             auth, menu.retrieve)
router.get('/iam/menu/:MENU_ID',                    auth, menu.get)
router.delete('/iam/menu/:MENU_ID',                 auth, menu.delete)
router.post('/iam/menu/order',                      auth, menu.order)
router.get('/iam/menu/count/all',                   auth, menu.count)


module.exports = router