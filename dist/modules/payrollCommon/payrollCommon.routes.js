"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payrollCommon_controller_1 = require("./payrollCommon.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Tax tables + pension rules (read for payroll viewers, write for rate managers).
router.get('/tax-brackets', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), payrollCommon_controller_1.PayrollCommonController.listTaxTables);
router.post('/tax-brackets', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_RATES), payrollCommon_controller_1.PayrollCommonController.createTaxTable);
router.get('/pension-rules', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), payrollCommon_controller_1.PayrollCommonController.listPensionRules);
router.post('/pension-rules', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_RATES), payrollCommon_controller_1.PayrollCommonController.createPensionRule);
// Employee deductions (loans / advances / penalties / other).
router.get('/deductions', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), payrollCommon_controller_1.PayrollCommonController.listDeductions);
router.post('/deductions', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_RATES), payrollCommon_controller_1.PayrollCommonController.createDeduction);
router.post('/deductions/:id/cancel', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_RATES), payrollCommon_controller_1.PayrollCommonController.cancelDeduction);
exports.default = router;
//# sourceMappingURL=payrollCommon.routes.js.map