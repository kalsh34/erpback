"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shiftSchedule_controller_1 = require("./shiftSchedule.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
/**
 * Shift Scheduling (redesigned rotation module).
 * Reuses the ROTATION_* permissions — same feature area, same roles.
 */
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_READ), shiftSchedule_controller_1.ShiftScheduleController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_READ), shiftSchedule_controller_1.ShiftScheduleController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.delete);
router.post('/:id/guards', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.addGuards);
router.delete('/:id/guards/:guardId', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.removeGuard);
router.put('/:id/pool/reorder', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.reorderPool);
router.post('/:id/floaters', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.addFloaters);
router.delete('/:id/floaters/:guardId', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.removeFloater);
router.get('/:id/preview', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_READ), shiftSchedule_controller_1.ShiftScheduleController.preview);
router.post('/:id/generate', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_GENERATE), shiftSchedule_controller_1.ShiftScheduleController.generate);
router.get('/:id/assignments', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_READ), shiftSchedule_controller_1.ShiftScheduleController.getAssignments);
router.delete('/:id/assignments', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_MANAGE), shiftSchedule_controller_1.ShiftScheduleController.clearAssignments);
router.get('/:id/commitments', (0, rbac_1.authorize)(types_1.PERMISSIONS.ROTATION_READ), shiftSchedule_controller_1.ShiftScheduleController.getGuardCommitments);
exports.default = router;
//# sourceMappingURL=shiftSchedule.routes.js.map