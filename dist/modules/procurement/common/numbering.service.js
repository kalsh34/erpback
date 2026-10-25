"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberingService = void 0;
const PurchaseSettings_1 = require("../../../models/PurchaseSettings");
const RFQ_1 = require("../../../models/RFQ");
const PurchaseOrder_1 = require("../../../models/PurchaseOrder");
const GoodsReceipt_1 = require("../../../models/GoodsReceipt");
const SupplierInvoice_1 = require("../../../models/SupplierInvoice");
const Contact_1 = require("../../../models/Contact");
const Product_1 = require("../../../models/Product");
class NumberingService {
    static async getOrCreateSettings() {
        let settings = await PurchaseSettings_1.PurchaseSettings.findOne();
        if (!settings) {
            settings = await PurchaseSettings_1.PurchaseSettings.create({});
        }
        return settings;
    }
    static async getNextNumber(type) {
        const year = new Date().getFullYear();
        const settings = await this.getOrCreateSettings();
        switch (type) {
            case 'RFQ': {
                const count = await RFQ_1.RFQ.countDocuments();
                const seq = Math.max(settings.nextRfqSeq || 1, count + 1);
                settings.nextRfqSeq = seq + 1;
                await settings.save();
                return `RFQ-${year}-${String(seq).padStart(5, '0')}`;
            }
            case 'PO': {
                const count = await PurchaseOrder_1.PurchaseOrder.countDocuments();
                const seq = Math.max(settings.nextPoSeq || 1, count + 1);
                settings.nextPoSeq = seq + 1;
                await settings.save();
                return `PO-${year}-${String(seq).padStart(5, '0')}`;
            }
            case 'GRN': {
                const count = await GoodsReceipt_1.GoodsReceipt.countDocuments();
                const seq = Math.max(settings.nextGrnSeq || 1, count + 1);
                settings.nextGrnSeq = seq + 1;
                await settings.save();
                return `GRN-${year}-${String(seq).padStart(5, '0')}`;
            }
            case 'BILL': {
                const count = await SupplierInvoice_1.SupplierInvoice.countDocuments();
                const seq = Math.max(settings.nextBillSeq || 1, count + 1);
                settings.nextBillSeq = seq + 1;
                await settings.save();
                return `BILL-${year}-${String(seq).padStart(5, '0')}`;
            }
            case 'CONTACT': {
                const count = await Contact_1.Contact.countDocuments();
                return `VEN-${String(count + 1).padStart(4, '0')}`;
            }
            case 'PRODUCT': {
                const count = await Product_1.Product.countDocuments();
                return `PRD-${String(count + 1).padStart(4, '0')}`;
            }
            default:
                throw new Error(`Unsupported document type: ${type}`);
        }
    }
}
exports.NumberingService = NumberingService;
//# sourceMappingURL=numbering.service.js.map