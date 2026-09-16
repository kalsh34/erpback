"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports_controller_1 = require("./reports.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/payroll-summary', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports_controller_1.ReportsController.getPayrollSummary);
router.get('/site-labor-cost', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports_controller_1.ReportsController.getSiteLaborCost);
router.get('/payment-history', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), reports_controller_1.ReportsController.getPaymentHistory);
exports.default = router;
//# sourceMappingURL=reports.routes.js.map