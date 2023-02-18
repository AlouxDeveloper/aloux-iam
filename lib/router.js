const express = require('express')
const auth = require('./auth.js')
const access = require('./access.js')
const router = express.Router()

const admin          = require('./controllers/admin')
const menu          = require('./controllers/menu')
const permission    = require('./controllers/permission')
const functions     = require('./controllers/functions')
const Util          = require('./controllers/util')


//Load Data
router.get('/iam/loadDataTables',  Util.loadDataTables) 

// IAM / Menu
router.post('/iam/menu',                    auth,menu.create)     
router.put('/iam/menu/:id',                 auth,menu.update)
router.put('/iam/menu/active/:id',          auth,menu.isActive)
router.get('/iam/menu',                     auth, menu.retrieve)
router.get('/iam/menu/:id',                 auth,menu.get)
router.delete('/iam/menu/:id',              auth,menu.delete)
router.post('/iam/menu/order',              auth,menu.order)

// IAM / Permission
router.post('/iam/permission',              auth,permission.create)     
router.put('/iam/permission/:id',           auth,permission.update)
router.put('/iam/permission/active/:id',    auth,permission.isActive)
router.get('/iam/permission',               auth,permission.retrieve)
router.get('/iam/permission/:id',           auth,permission.get)
router.delete('/iam/permission/:id',        auth,permission.delete)

// IAM / Function
router.post('/iam/functions',               auth,functions.create)     
router.put('/iam/functions/:id',            auth,functions.update)
router.put('/iam/functions/active/:id',     auth,functions.isActive)
router.get('/iam/functions',                auth,functions.retrieve)
router.get('/iam/functions/:id',            auth,functions.get)
router.delete('/iam/functions/:id',         auth,functions.delete)

// IAM / Admin
router.post('/iam/admin',                   auth,admin.create)
router.get('/iam/admin',                    auth,admin.retrieve)
router.get('/iam/admin/:id',                auth,admin.get)
router.put('/iam/admin/:id',                auth,admin.update)
router.put('/iam/admin/active/:id',         auth,admin.isActive)
router.put('/iam/admin/password/:id',       auth,admin.updatepassword)
router.delete('/iam/admin/:id',             auth,admin.delete)

// Admin / self
router.post('/admin/login',                     admin.login)
router.get('/admin/logout',                 auth, admin.logout)
router.get('/admin/me',                     auth, admin.me)
router.put('/admin/profile',                auth, admin.updateAny)
router.put('/admin/profile/pictura',        auth, admin.updatePicture)

// Admin Extra
router.post('/admin/forgot/password',                               admin.recoverpassword) 
router.post('/admin/validate/code',                                 admin.verifyCode) 
router.post('/admin/reset/password',                                admin.resetPassword)
router.put('/admin/reset/password',                                 auth, admin.resetPass)

module.exports = router