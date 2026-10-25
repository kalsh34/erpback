"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseSettingsController = void 0;
const purchaseSettings_service_1 = require("./purchaseSettings.service");
class PurchaseSettingsController {
    static async get(req, res, next) {
        try {
            const result = await purchaseSettings_service_1.PurchaseSettingsService.getSettings();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await purchaseSettings_service_1.PurchaseSettingsService.updateSettings(req.body, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PurchaseSettingsController = PurchaseSettingsController;
//# sourceMappingURL=purchaseSettings.controller.js.map