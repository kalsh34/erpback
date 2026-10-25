"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchaseReport_controller_1 = require("./purchaseReport.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/dashboard', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), purchaseReport_controller_1.PurchaseReportController.getDashboard);
router.get('/po-summary', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), purchaseReport_controller_1.PurchaseReportController.getPOSummary);
router.get('/supplier-spend', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), purchaseReport_controller_1.PurchaseReportController.getSupplierSpend);
router.get('/price-history', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), purchaseReport_controller_1.PurchaseReportController.getProductPriceHistory);
router.get('/outstanding', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), purchaseReport_controller_1.PurchaseReportController.getOutstanding);
router.get('/spend-analysis', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), purchaseReport_controller_1.PurchaseReportController.getSpendAnalysis);
exports.default = router;
//# sourceMappingURL=purchaseReport.routes.js.map