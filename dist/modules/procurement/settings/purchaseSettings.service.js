"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseSettingsService = void 0;
const PurchaseSettings_1 = require("../../../models/PurchaseSettings");
const AuditLog_1 = require("../../../models/AuditLog");
class PurchaseSettingsService {
    static async getSettings() {
        let settings = await PurchaseSettings_1.PurchaseSettings.findOne();
        if (!settings) {
            settings = await PurchaseSettings_1.PurchaseSettings.create({});
        }
        return settings;
    }
    static async updateSettings(data, context) {
        let settings = await PurchaseSettings_1.PurchaseSettings.findOne();
        if (!settings) {
            settings = await PurchaseSettings_1.PurchaseSettings.create({});
        }
        const oldValues = settings.toObject();
        Object.assign(settings, data);
        await settings.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PURCHASE_SETTINGS_UPDATE',
                entity: 'PurchaseSettings',
                entityId: settings._id,
                oldValues,
                newValues: settings.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return settings;
    }
}
exports.PurchaseSettingsService = PurchaseSettingsService;
//# sourceMappingURL=purchaseSettings.service.js.map