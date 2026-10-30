"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const proforma_controller_1 = require("./proforma.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Proformas (Phase C of Proposal & Proforma Management).
// Reads are gated on SERVICE_READ; draft management (create/edit/void/amend)
// on SERVICE_MANAGE — the same module bundle as the Phase A service library.
// Approving + issuing is a MANAGER-ONLY action gated on the dedicated
// PROFORMA_ISSUE permission, which is NOT part of any module bundle: holding
// a marketing grant can never confer it, so module grants cannot punch
// through to issuance. (Phase C policy correction.)
// Lifecycle is server-controlled:
//   POST /              create DRAFT (number allocated)
//   PUT  /:id           edit DRAFT only (discount changes additionally require
//                       PROFORMA_DISCOUNT — enforced inside the service)
//   POST /:id/issue     DRAFT → ISSUED (+ auto-supersede the amended parent);
//                       records the approving/issuing actor + audit event
//   POST /:id/void      DRAFT → VOID
//   POST /:id/amend     ISSUED → fresh DRAFT revision (issued docs immutable)
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), proforma_controller_1.ProformaController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), proforma_controller_1.ProformaController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), proforma_controller_1.ProformaController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), proforma_controller_1.ProformaController.update);
router.post('/:id/issue', (0, rbac_1.authorize)(types_1.PERMISSIONS.PROFORMA_ISSUE), proforma_controller_1.ProformaController.issue);
router.post('/:id/void', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), proforma_controller_1.ProformaController.void);
router.post('/:id/amend', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), proforma_controller_1.ProformaController.amend);
exports.default = router;
//# sourceMappingURL=proforma.routes.js.map