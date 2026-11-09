"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("./company.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Company registration for proformas.
// Reads: service.read. Writes: service.manage (the marketing module bundle) OR
// proforma.issue — the issuing authority also has to be able to register the
// client it is about to quote. The CEO role stays read-only through the
// ROLE_MANDATORY_DENIES entries for both permissions.
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), company_controller_1.ProformaCompanyController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), company_controller_1.ProformaCompanyController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), company_controller_1.ProformaCompanyController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), company_controller_1.ProformaCompanyController.update);
router.post('/:id/deactivate', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), company_controller_1.ProformaCompanyController.deactivate);
exports.default = router;
//# sourceMappingURL=company.routes.js.map