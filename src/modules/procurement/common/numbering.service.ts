import { PurchaseSettings } from '../../../models/PurchaseSettings';
import { RFQ } from '../../../models/RFQ';
import { PurchaseOrder } from '../../../models/PurchaseOrder';
import { GoodsReceipt } from '../../../models/GoodsReceipt';
import { SupplierInvoice } from '../../../models/SupplierInvoice';
import { Contact } from '../../../models/Contact';
import { Product } from '../../../models/Product';

export class NumberingService {
  private static async getOrCreateSettings() {
    let settings = await PurchaseSettings.findOne();
    if (!settings) {
      settings = await PurchaseSettings.create({});
    }
    return settings;
  }

  public static async getNextNumber(type: 'RFQ' | 'PO' | 'GRN' | 'BILL' | 'CONTACT' | 'PRODUCT'): Promise<string> {
    const year = new Date().getFullYear();
    const settings = await this.getOrCreateSettings();

    switch (type) {
      case 'RFQ': {
        const count = await RFQ.countDocuments();
        const seq = Math.max(settings.nextRfqSeq || 1, count + 1);
        settings.nextRfqSeq = seq + 1;
        await settings.save();
        return `RFQ-${year}-${String(seq).padStart(5, '0')}`;
      }
      case 'PO': {
        const count = await PurchaseOrder.countDocuments();
        const seq = Math.max(settings.nextPoSeq || 1, count + 1);
        settings.nextPoSeq = seq + 1;
        await settings.save();
        return `PO-${year}-${String(seq).padStart(5, '0')}`;
      }
      case 'GRN': {
        const count = await GoodsReceipt.countDocuments();
        const seq = Math.max(settings.nextGrnSeq || 1, count + 1);
        settings.nextGrnSeq = seq + 1;
        await settings.save();
        return `GRN-${year}-${String(seq).padStart(5, '0')}`;
      }
      case 'BILL': {
        const count = await SupplierInvoice.countDocuments();
        const seq = Math.max(settings.nextBillSeq || 1, count + 1);
        settings.nextBillSeq = seq + 1;
        await settings.save();
        return `BILL-${year}-${String(seq).padStart(5, '0')}`;
      }
      case 'CONTACT': {
        const count = await Contact.countDocuments();
        return `VEN-${String(count + 1).padStart(4, '0')}`;
      }
      case 'PRODUCT': {
        const count = await Product.countDocuments();
        return `PRD-${String(count + 1).padStart(4, '0')}`;
      }
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }
}
