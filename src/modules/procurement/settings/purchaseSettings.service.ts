import { PurchaseSettings, IPurchaseSettings } from '../../../models/PurchaseSettings';
import { AuditLog } from '../../../models/AuditLog';

export class PurchaseSettingsService {
  static async getSettings() {
    let settings = await PurchaseSettings.findOne();
    if (!settings) {
      settings = await PurchaseSettings.create({});
    }
    return settings;
  }

  static async updateSettings(data: Partial<IPurchaseSettings>, context: { userId?: string; ip?: string; ua?: string }) {
    let settings = await PurchaseSettings.findOne();
    if (!settings) {
      settings = await PurchaseSettings.create({});
    }

    const oldValues = settings.toObject();

    Object.assign(settings, data);
    await settings.save();

    if (context.userId) {
      await AuditLog.create({
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
