const express = require("express");
const middleware = require("./middleware.js");
const router = express.Router();

const auth = require("./controllers/auth");
const user = require("./controllers/user");
const menu = require("./controllers/menu");
const permission = require("./controllers/permission");
const functions = require("./controllers/functions");
const label = require("./controllers/label");
const log = require("./controllers/log");
const business = require("./controllers/business");
const company = require("./controllers/company");

const history = require("./controllers/history.js");

// User / user self (no auth)
router.post("/iam/auth/email", auth.email);
router.post("/iam/auth/login", auth.login);
router.post("/iam/auth/forgot/password", auth.recoverpassword);
router.post("/iam/auth/validate/code", auth.verifyCode);
router.post("/iam/auth/verify/mail", auth.sendVerifyMailAccount);
router.get("/iam/auth/verify/mail/token/:token", auth.verifyMailTokenAccount);
router.post("/iam/auth/reset/password", auth.resetPassword);
router.post("/iam/auth/signup", auth.createCustomer);

// User / user self
router.get("/iam/auth/me", middleware, auth.me);
router.patch("/iam/auth/profile", middleware, auth.updateAny);
router.put("/iam/auth/profile/pictura", middleware, auth.updatePicture);
router.put("/iam/auth/reset/password", middleware, auth.resetPass);
router.post("/iam/auth/send/verify/phone", middleware, auth.verifyPhone);
router.post("/iam/auth/verify/phone", middleware, auth.validatePhone);
router.post("/iam/auth/logout", middleware, auth.logout);
router.patch("/iam/auth/mail", middleware, auth.mailChange);
router.post("/iam/auth/validate/mail", middleware, auth.validatEmailChange);

// IAM / User
router.post("/iam/user", middleware, user.create);
router.get("/iam/user", middleware, user.retrieve);
router.get("/iam/business/user", middleware, user.retrieveByBusiness);
router.get("/iam/user/:USER_ID", middleware, user.get);
router.patch("/iam/user/:USER_ID", middleware, user.update);
router.put("/iam/user/:USER_ID/status", middleware, user.status);
router.put("/iam/user/password/:USER_ID", middleware, user.updatepassword);
router.delete("/iam/user/:USER_ID", middleware, user.delete);
router.get("/iam/user/count/all", middleware, user.count);

// IAM / Function
router.post("/iam/functions", middleware, functions.create);
router.patch("/iam/functions/:FUNCTION_ID", middleware, functions.update);
router.put("/iam/functions/:FUNCTION_ID/status", middleware, functions.status);
router.get("/iam/functions", middleware, functions.retrieve);
router.get("/iam/functions/:FUNCTION_ID", middleware, functions.get);
router.delete("/iam/functions/:FUNCTION_ID", middleware, functions.delete);
router.get("/iam/functions/count/all", middleware, functions.count);

// IAM / Permission
router.post("/iam/permission", middleware, permission.create);
router.patch("/iam/permission/:PERMISSION_ID", middleware, permission.update);
router.put(
  "/iam/permission/:PERMISSION_ID/status",
  middleware,
  permission.status
);
router.get("/iam/permission", middleware, permission.retrieve);
router.get("/iam/permission/:PERMISSION_ID", middleware, permission.get);
router.delete("/iam/permission/:PERMISSION_ID", middleware, permission.delete);
router.get("/iam/permission/count/all", middleware, permission.count);

// IAM / Menu
router.post("/iam/menu", middleware, menu.create);
router.patch("/iam/menu/:MENU_ID", middleware, menu.update);
router.put("/iam/menu/:MENU_ID/status", middleware, menu.status);
router.get("/iam/menu", middleware, menu.retrieve);
router.get("/iam/menu/:MENU_ID", middleware, menu.get);
router.delete("/iam/menu/:MENU_ID", middleware, menu.delete);
router.post("/iam/menu/order", middleware, menu.order);
router.get("/iam/menu/count/all", middleware, menu.count);

// IAM / History
router.post("/iam/retrieve/history", middleware, history.retrieve);
router.get("/iam/history/:HISTORY_ID", middleware, history.detail);

// Utilities
router.patch("/iam/add/time/:TOKEN", user.addTimeToken);

// IAM / Label
router.post("/iam/label", middleware, label.create);
router.patch("/iam/label/:LABEL_ID", middleware, label.update);
router.put("/iam/label/:LABEL_ID/status", middleware, label.status);
router.get("/iam/label", middleware, label.retrieve);
router.get("/iam/label/:LABEL_ID", middleware, label.get);
router.delete("/iam/label/:LABEL_ID", middleware, label.delete);
router.get("/iam/label/count/all", middleware, label.count);

// IAM / Log
router.post("/iam/log", middleware, log.create);
router.patch("/iam/log/:LOG_ID", middleware, log.update);
router.put("/iam/log/:LOG_ID/status", middleware, log.status);
router.post("/iam/log/retrieve", middleware, log.retrieve);
router.get("/iam/log/:LOG_ID", middleware, log.get);
router.delete("/iam/log/:LOG_ID", middleware, log.delete);
router.get("/iam/log/count/all", middleware, log.count);

//Business
router.post("/iam/business", middleware, business.create);
router.get("/iam/business", middleware, business.retrieve);
router.post("/iam/business/company", middleware, business.retrieveByCompany);
router.get("/iam/business/my", middleware, business.retrieveMy);
router.get(
  "/iam/business/my/company/:COMPANY_ID",
  middleware,
  business.retrieveMyCompany
);
router.get("/iam/business/:BUSINESS_ID", middleware, business.detail);
router.put("/iam/business/:BUSINESS_ID", middleware, business.update);
router.delete("/iam/business/:BUSINESS_ID", middleware, business.delete);
router.patch(
  "/iam/business/:BUSINESS_ID/picture",
  middleware,
  business.picture
);
router.patch(
  "/iam/business/:BUSINESS_ID/favicon",
  middleware,
  business.favicon
);
router.get("/iam/business/:ID/identity", business.identity);

//Company
router.post("/iam/company", middleware, company.create);
router.get("/iam/company", middleware, company.retrieve);
router.get("/iam/company/my", middleware, company.retrieveMy);
router.get("/iam/company/:COMPANY_ID", middleware, company.detail);
router.patch("/iam/company/:COMPANY_ID", middleware, company.update);
router.delete("/iam/company/:COMPANY_ID", middleware, company.delete);
router.patch("/iam/company/:COMPANY_ID/picture", middleware, company.picture);
router.patch("/iam/company/:COMPANY_ID/favicon", middleware, company.favicon);
router.get("/iam/company/:ID/identity", company.identity);

module.exports = router;
