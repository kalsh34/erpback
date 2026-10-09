"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const guardPayroll_controller_1 = require("./guardPayroll.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const READ = types_1.PERMISSIONS.GUARD_PAYROLL_READ;
const RATES = types_1.PERMISSIONS.GUARD_PAYROLL_RATES;
const CALCULATE = types_1.PERMISSIONS.GUARD_PAYROLL_CALCULATE;
const CHECK = types_1.PERMISSIONS.GUARD_PAYROLL_CHECK;
const APPROVE = types_1.PERMISSIONS.GUARD_PAYROLL_APPROVE;
const PAY = types_1.PERMISSIONS.GUARD_PAYROLL_PAY;
const RETURN = types_1.PERMISSIONS.GUARD_PAYROLL_RETURN;
router.get('/status', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.status);
// Engine configuration (transport %, divisors).
router.get('/config', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.getConfig);
router.put('/config', (0, rbac_1.authorize)(RATES), guardPayroll_controller_1.GuardPayrollController.updateConfig);
// Effective-dated site compensation — the payroll rate source of truth.
router.get('/compensations', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.listCompensations);
router.post('/compensations', (0, rbac_1.authorize)(RATES), guardPayroll_controller_1.GuardPayrollController.createCompensation);
router.delete('/compensations/:id', (0, rbac_1.authorize)(RATES), guardPayroll_controller_1.GuardPayrollController.deleteCompensation);
// Runs: calculate, lifecycle, history.
router.get('/', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.list);
router.post('/generate/:periodKey', (0, rbac_1.authorize)(CALCULATE), guardPayroll_controller_1.GuardPayrollController.createRun);
router.post('/runs', (0, rbac_1.authorize)(CALCULATE), guardPayroll_controller_1.GuardPayrollController.createRun);
router.get('/runs', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.listRuns);
router.get('/runs/:id', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.getRun);
router.post('/runs/:id/recalculate', (0, rbac_1.authorize)(CALCULATE), guardPayroll_controller_1.GuardPayrollController.recalculateRun);
router.post('/runs/:id/submit', (0, rbac_1.authorize)(CALCULATE), guardPayroll_controller_1.GuardPayrollController.submitRun);
router.post('/runs/:id/check', (0, rbac_1.authorize)(CHECK), guardPayroll_controller_1.GuardPayrollController.checkRun);
router.post('/runs/:id/approve', (0, rbac_1.authorize)(APPROVE), guardPayroll_controller_1.GuardPayrollController.approveRun);
router.post('/runs/:id/return', (0, rbac_1.authorize)(RETURN), guardPayroll_controller_1.GuardPayrollController.returnRun);
router.post('/runs/:id/pay', (0, rbac_1.authorize)(PAY), guardPayroll_controller_1.GuardPayrollController.payRun);
router.get('/runs/:id/export/bank', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.exportBank);
router.get('/runs/:id/export/tax', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.exportTax);
router.get('/runs/:id/export/pension', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.exportPension);
router.get('/records/:id', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.getRecord);
router.get('/records/:id/payslip', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.getPayslip);
router.get('/my', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.myPayroll);
// Attendance lock state for the attendance pages (read-level so Operations can see it).
router.get('/attendance-lock', (0, rbac_1.authorize)(READ), guardPayroll_controller_1.GuardPayrollController.attendanceLock);
exports.default = router;
//# sourceMappingURL=guardPayroll.routes.js.map