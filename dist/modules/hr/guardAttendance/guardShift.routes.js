"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const guardShift_controller_1 = require("./guardShift.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
/**
 * Mounted at /api/attendance/shifts BEFORE the guardAttendance router so the
 * static '/shifts/...' paths never collide with '/:id/void'.
 */
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/clock-in', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_SELF), guardShift_controller_1.GuardShiftController.clockIn);
router.post('/clock-out', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_SELF), guardShift_controller_1.GuardShiftController.clockOut);
router.get('/my', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ATTENDANCE_SELF), guardShift_controller_1.GuardShiftController.my);
exports.default = router;
//# sourceMappingURL=guardShift.routes.js.map