"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/roles', user_controller_1.UserController.getRoles);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_READ), user_controller_1.UserController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_READ), user_controller_1.UserController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_CREATE), user_controller_1.UserController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_UPDATE), user_controller_1.UserController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_DELETE), user_controller_1.UserController.delete);
router.put('/:id/activate', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_UPDATE), user_controller_1.UserController.activate);
router.put('/:id/deactivate', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_UPDATE), user_controller_1.UserController.deactivate);
exports.default = router;
//# sourceMappingURL=user.routes.js.map