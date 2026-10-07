"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("./company.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.COMPANY_READ), company_controller_1.CompanyController.getAll);
router.get('/:id/detail', (0, rbac_1.authorize)(types_1.PERMISSIONS.COMPANY_READ), company_controller_1.CompanyController.detail);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.COMPANY_READ), company_controller_1.CompanyController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.COMPANY_CREATE), company_controller_1.CompanyController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.COMPANY_UPDATE), company_controller_1.CompanyController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.COMPANY_UPDATE), company_controller_1.CompanyController.delete);
exports.default = router;
//# sourceMappingURL=company.routes.js.map