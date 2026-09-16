"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staffAttendance_controller_1 = require("./staffAttendance.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/day', (0, rbac_1.authorize)(types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE), staffAttendance_controller_1.StaffAttendanceController.saveDayStatus);
router.post('/bulk', (0, rbac_1.authorize)(types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE), staffAttendance_controller_1.StaffAttendanceController.bulkMarkDay);
router.get('/grid', (0, rbac_1.authorize)(types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE), staffAttendance_controller_1.StaffAttendanceController.getGrid);
router.get('/summary', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), staffAttendance_controller_1.StaffAttendanceController.getMonthlySummary);
router.get('/periods', (0, rbac_1.authorize)(types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE), staffAttendance_controller_1.StaffAttendanceController.getAllPeriods);
router.post('/lock', (0, rbac_1.authorize)(types_1.PERMISSIONS.OFFICE_PAYROLL_RATES), staffAttendance_controller_1.StaffAttendanceController.lockPeriod);
router.post('/unlock', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), staffAttendance_controller_1.StaffAttendanceController.unlockPeriod);
exports.default = router;
//# sourceMappingURL=staffAttendance.routes.js.map