const express = require('express')
const auth = require('./auth.js')
const access = require('./access.js')
const router = express.Router()

const user          = require('./controllers/user')
const menu          = require('./controllers/menu')
const permission    = require('./controllers/permission')
const functions     = require('./controllers/functions')
const Util          = require('./controllers/util')


//Load Data
router.get('/iam/loadDataTables',  Util.loadDataTables) 






// User / user self (no auth)
router.post('/user/email',                  user.email)
router.post('/user/login',                  user.login)
router.post('/user/forgot/password',        user.recoverpassword) 
router.post('/user/validate/code',          user.verifyCode) 
router.post('/user/reset/password',         user.resetPassword)

// User / user self
router.get('/user/me',                      auth, user.me)
router.put('/user/profile',                 auth, user.updateAny)
router.put('/user/profile/pictura',         auth, user.updatePicture)
router.put('/user/reset/password',          auth, user.resetPass)
router.get('/user/logout',                  auth, user.logout)

// IAM / User
router.post('/iam/user',                    auth,user.create)
router.get('/iam/user',                     auth,user.retrieve)
router.get('/iam/user/:id',                 auth,user.get)
router.put('/iam/user/:id',                 auth,user.update)
router.put('/iam/user/active/:id',          auth,user.isActive)
router.put('/iam/user/password/:id',        auth,user.updatepassword)
router.delete('/iam/user/:id',              auth,user.delete)


// IAM / Function
router.post('/iam/functions',               auth,functions.create)     
router.put('/iam/functions/:id',            auth,functions.update)
router.put('/iam/functions/active/:id',     auth,functions.isActive)
router.get('/iam/functions',                auth,functions.retrieve)
router.get('/iam/functions/:id',            auth,functions.get)
router.delete('/iam/functions/:id',         auth,functions.delete)

// IAM / Permission
router.post('/iam/permission',              auth,permission.create)     
router.put('/iam/permission/:id',           auth,permission.update)
router.put('/iam/permission/active/:id',    auth,permission.isActive)
router.get('/iam/permission',               auth,permission.retrieve)
router.get('/iam/permission/:id',           auth,permission.get)
router.delete('/iam/permission/:id',        auth,permission.delete)

// IAM / Menu
router.post('/iam/menu',                    auth,menu.create)     
router.put('/iam/menu/:id',                 auth,menu.update)
router.put('/iam/menu/active/:id',          auth,menu.isActive)
router.get('/iam/menu',                     auth, menu.retrieve)
router.get('/iam/menu/:id',                 auth,menu.get)
router.delete('/iam/menu/:id',              auth,menu.delete)
router.post('/iam/menu/order',              auth,menu.order)


module.exports = router