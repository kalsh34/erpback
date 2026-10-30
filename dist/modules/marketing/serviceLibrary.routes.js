"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceLibrary_controller_1 = require("./serviceLibrary.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Service Library (Phase A of Proposal & Proforma Management).
// Every write is permission-gated on SERVICE_MANAGE, reads on SERVICE_READ.
// No hard delete exists by design — entries are softly deactivated so proforma
// snapshots (later phase) always resolve to a stable historical record.
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), serviceLibrary_controller_1.ServiceLibraryController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_READ), serviceLibrary_controller_1.ServiceLibraryController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), serviceLibrary_controller_1.ServiceLibraryController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), serviceLibrary_controller_1.ServiceLibraryController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), serviceLibrary_controller_1.ServiceLibraryController.deactivate);
router.post('/:id/reactivate', (0, rbac_1.authorize)(types_1.PERMISSIONS.SERVICE_MANAGE), serviceLibrary_controller_1.ServiceLibraryController.reactivate);
exports.default = router;
//# sourceMappingURL=serviceLibrary.routes.js.map