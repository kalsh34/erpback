"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const validate_1 = require("../../middleware/validate");
const auth_validation_1 = require("./auth.validation");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.post('/login', auth_validation_1.loginValidation, validate_1.validate, auth_controller_1.AuthController.login);
router.post('/register', auth_1.authenticate, (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_CREATE), auth_validation_1.registerValidation, validate_1.validate, auth_controller_1.AuthController.register);
router.get('/me', auth_1.authenticate, auth_controller_1.AuthController.getMe);
router.put('/change-password', auth_1.authenticate, auth_validation_1.changePasswordValidation, validate_1.validate, auth_controller_1.AuthController.changePassword);
router.put('/profile', auth_1.authenticate, auth_validation_1.updateProfileValidation, validate_1.validate, auth_controller_1.AuthController.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map