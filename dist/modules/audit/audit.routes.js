"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("./audit.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.AUDIT_READ), audit_controller_1.AuditController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.AUDIT_READ), audit_controller_1.AuditController.getById);
exports.default = router;
//# sourceMappingURL=audit.routes.js.map