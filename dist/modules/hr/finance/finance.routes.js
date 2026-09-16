"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_controller_1 = require("./finance.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/periods', (0, rbac_1.authorize)(types_1.PERMISSIONS.PAYROLL_PERIOD_READ), finance_controller_1.FinanceController.getAllPeriods);
router.get('/periods/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.PAYROLL_PERIOD_READ), finance_controller_1.FinanceController.getPeriodById);
router.post('/periods', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), finance_controller_1.FinanceController.createPeriod);
router.put('/periods/:id/status', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), finance_controller_1.FinanceController.updatePeriodStatus);
router.put('/periods/:id/lock', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), finance_controller_1.FinanceController.lockPeriod);
router.put('/rates/:periodId', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_RATES), finance_controller_1.FinanceController.setRates);
router.get('/rates/:periodId', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_READ), finance_controller_1.FinanceController.getRates);
exports.default = router;
//# sourceMappingURL=finance.routes.js.map