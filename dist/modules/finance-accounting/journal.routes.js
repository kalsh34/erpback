"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const journal_controller_1 = require("./journal.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/dashboard', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), journal_controller_1.JournalController.getDashboardSummary);
router.get('/accounts/summary', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), journal_controller_1.JournalController.getAccountSummary);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), journal_controller_1.JournalController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.REPORT_READ), journal_controller_1.JournalController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_PAY), journal_controller_1.JournalController.createEntry);
router.put('/:id/void', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_PAYROLL_PAY), journal_controller_1.JournalController.voidEntry);
exports.default = router;
//# sourceMappingURL=journal.routes.js.map