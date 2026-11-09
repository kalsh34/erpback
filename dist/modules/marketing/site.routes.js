"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const site_controller_1 = require("./site.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Client sites (filtered by ?companyId=), the second half of the client block
// on every proforma.
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), site_controller_1.ProformaSiteController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), site_controller_1.ProformaSiteController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), site_controller_1.ProformaSiteController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), site_controller_1.ProformaSiteController.update);
exports.default = router;
//# sourceMappingURL=site.routes.js.map