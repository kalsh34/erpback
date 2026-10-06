"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const guardAttendance_controller_1 = require("./guardAttendance.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/config', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_READ), guardAttendance_controller_1.GuardAttendanceController.getConfig);
router.get('/day', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_READ), guardAttendance_controller_1.GuardAttendanceController.getDay);
router.post('/day', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_MANAGE), guardAttendance_controller_1.GuardAttendanceController.saveDay);
router.post('/:id/void', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_MANAGE), guardAttendance_controller_1.GuardAttendanceController.voidRecord);
router.get('/monthly', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_READ), guardAttendance_controller_1.GuardAttendanceController.getMonthly);
router.get('/payroll-readiness', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_READ), guardAttendance_controller_1.GuardAttendanceController.getPayrollReadiness);
router.get('/records', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_READ), guardAttendance_controller_1.GuardAttendanceController.listRecords);
exports.default = router;
//# sourceMappingURL=guardAttendance.routes.js.map