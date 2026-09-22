"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payrollRun_controller_1 = require("./payrollRun.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), payrollRun_controller_1.PayrollRunController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), payrollRun_controller_1.PayrollRunController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.OFFICE_PAYROLL_CREATE), payrollRun_controller_1.PayrollRunController.create);
router.post('/:id/approve', (0, rbac_1.authorize)(types_1.PERMISSIONS.OFFICE_PAYROLL_APPROVE), payrollRun_controller_1.PayrollRunController.approve);
router.post('/:id/mark-paid', (0, rbac_1.authorize)(types_1.PERMISSIONS.OFFICE_PAYROLL_PAY), payrollRun_controller_1.PayrollRunController.markPaid);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.OFFICE_PAYROLL_CREATE), payrollRun_controller_1.PayrollRunController.remove);
exports.default = router;
//# sourceMappingURL=payrollRun.routes.js.map