import { IPurchaseSettings } from '../../../models/PurchaseSettings';
export declare class PurchaseSettingsService {
    static getSettings(): Promise<import("mongoose").Document<unknown, {}, IPurchaseSettings, {}, {}> & IPurchaseSettings & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateSettings(data: Partial<IPurchaseSettings>, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseSettings, {}, {}> & IPurchaseSettings & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=purchaseSettings.service.d.ts.map