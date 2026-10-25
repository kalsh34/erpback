"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseReportController = void 0;
const purchaseReport_service_1 = require("./purchaseReport.service");
class PurchaseReportController {
    static async getDashboard(req, res, next) {
        try {
            const result = await purchaseReport_service_1.PurchaseReportService.getDashboard();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPOSummary(req, res, next) {
        try {
            const result = await purchaseReport_service_1.PurchaseReportService.getPOSummaryReport(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSupplierSpend(req, res, next) {
        try {
            const result = await purchaseReport_service_1.PurchaseReportService.getSupplierSpendReport();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getProductPriceHistory(req, res, next) {
        try {
            const { productId } = req.query;
            const result = await purchaseReport_service_1.PurchaseReportService.getProductPriceHistory(productId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getOutstanding(req, res, next) {
        try {
            const result = await purchaseReport_service_1.PurchaseReportService.getOutstandingOrdersReport();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpendAnalysis(req, res, next) {
        try {
            const result = await purchaseReport_service_1.PurchaseReportService.getSpendAnalysis();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PurchaseReportController = PurchaseReportController;
//# sourceMappingURL=purchaseReport.controller.js.map