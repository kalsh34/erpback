"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceRole_controller_1 = require("./serviceRole.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Service / guard role catalog. Only ACTIVE roles are offered to the proforma
// picker (?activeOnly=true); inactive roles keep their history.
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), serviceRole_controller_1.ServiceRoleController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), serviceRole_controller_1.ServiceRoleController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), serviceRole_controller_1.ServiceRoleController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), serviceRole_controller_1.ServiceRoleController.update);
exports.default = router;
//# sourceMappingURL=serviceRole.routes.js.map