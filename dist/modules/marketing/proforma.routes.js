"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const proforma_controller_1 = require("./proforma.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Proforma lifecycle (server-controlled):
//   POST /              create DRAFT (number PF/VGT/<year>/<nnnn> allocated)
//   PUT  /:id           edit a DRAFT only (issued documents are frozen)
//   POST /:id/issue     DRAFT → ISSUED (manager/issuing authority only)
//   POST /:id/status    accept / expire / convert / cancel per transition map
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), proforma_controller_1.ProformaController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), proforma_controller_1.ProformaController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), proforma_controller_1.ProformaController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), proforma_controller_1.ProformaController.update);
router.post('/:id/issue', (0, rbac_1.authorize)(types_1.PERMISSIONS.PROFORMA_ISSUE), proforma_controller_1.ProformaController.issue);
router.post('/:id/status', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE, types_1.PERMISSIONS.PROFORMA_ISSUE), proforma_controller_1.ProformaController.setStatus);
exports.default = router;
//# sourceMappingURL=proforma.routes.js.map