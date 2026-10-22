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
 * Module-report permissions (DEF-H3 / DEF-M2).
 *
 * Every business endpoint is gated by REPORT_READ plus a ROLE-SCOPE guard
 * (requireReportRole in the controller, re-asserted in ModuleReportsService):
 * a REPORT_READ holder may only read the reports belonging to their own
 * domain — HR sees HR reports, Operations sees sites/guards/guard-attendance,
 * Finance and the Head see payroll, the CEO reads everything but mutates
 * nothing.
 *
 * audit + users require the DEDICATED administration permission on top of the
 * role scope — `report.read` alone must never expose the audit trail or the
 * user list (previously any REPORT_READ role, HR/Operations included, could
 * read both — DEF-M2).
 */
router.get('/hr', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.hr);
router.get('/sites', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.sites);
router.get('/guards', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.guards);
router.get('/guard-attendance', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.guardAttendance);
router.get('/staff-attendance', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.staffAttendance);
router.get('/payroll', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports2_controller_1.Reports2Controller.payroll);
router.get('/audit', (0, rbac_1.authorize)(types_1.PERMISSIONS.AUDIT_READ), reports2_controller_1.Reports2Controller.audit);
router.get('/users', (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_READ), reports2_controller_1.Reports2Controller.users);
exports.default = router;
//# sourceMappingURL=reports2.routes.js.map