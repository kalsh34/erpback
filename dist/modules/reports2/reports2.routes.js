"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports2_controller_1 = require("./reports2.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/**
 * Per-module reports. Every endpoint is gated by REPORT_READ — held by every
 * in-charge role (SUPER_ADMIN, HR_ADMIN, FINANCE_OFFICER, OPERATIONS, HEAD,
 * CEO) and NOT by GUARD, so "the man in charge" sees the pages and guards do not.
 */
router.get('/hr', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.hr);
router.get('/sites', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.sites);
router.get('/guards', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.guards);
router.get('/guard-attendance', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.guardAttendance);
router.get('/staff-attendance', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.staffAttendance);
router.get('/payroll', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.payroll);
router.get('/audit', (0, rbac_1.authorize)(types_1.PERMISSIONS.AUDIT_READ, types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.audit);
router.get('/users', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_READ, types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.users);
exports.default = router;
//# sourceMappingURL=reports2.routes.js.map