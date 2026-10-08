import mongoose from 'mongoose';
import { config } from './config/env';
import { ContactService } from './modules/procurement/contacts/contact.service';
import { ProductService } from './modules/procurement/products/product.service';
import { RFQService } from './modules/procurement/rfqs/rfq.service';
import { POService } from './modules/procurement/orders/po.service';
import { ReceiptService } from './modules/procurement/receipts/receipt.service';
import { BillService } from './modules/procurement/bills/bill.service';
import { PurchaseReportService } from './modules/procurement/reports/purchaseReport.service';
import { User } from './models/User';
import { RFQStatus, POStatus, BillStatus } from './types';

async function runTest() {
  console.log('[TEST] Connecting to MongoDB:', config.mongoUri);
  await mongoose.connect(config.mongoUri);
  console.log('[TEST] Connected to MongoDB');

  try {
    // 1. Find or create an admin user for context
    let admin = await User.findOne({ email: 'admin@vitalpayroll.com' });
    if (!admin) {
      admin = await User.findOne({});
    }
    const adminId = admin ? admin._id.toString() : new mongoose.Types.ObjectId().toString();
    const context = { userId: adminId, userRole: 'SUPER_ADMIN', ip: '127.0.0.1', ua: 'TestRunner' };

    console.log('[TEST] Step 1: Create Supplier Contact');
    const supplier = await ContactService.create(
      {
        name: 'Vital Uniforms & Equipment Supplies PLC',
        contactType: 'COMPANY' as any,
        isSupplier: true,
        isCustomer: false,
        email: 'sales@vitaluniforms.et',
        phone: '+251 91 122 3344',
        address: 'Bole Medhanialem, House 402',
        city: 'Addis Ababa',
        country: 'Ethiopia',
        tin: '9988776655',
        paymentTerms: 'NET_30',
        currency: 'ETB',
        supplierCategory: 'MANUFACTURER',
        deliveryTerms: 'EXW',
        supplierRating: 5,
      },
      context
    );
    console.log(`[PASS] Supplier created: ${supplier.name} (${supplier.code})`);

    console.log('[TEST] Step 2: Create Products');
    const uniform = await ProductService.create(
      {
        name: 'Security Officer Tactical Uniform (Full Set)',
        type: 'STOCKABLE' as any,
        category: 'Uniforms',
        uom: 'SET',
        purchasePrice: 1200,
        salesPrice: 1500,
        defaultSupplierId: supplier._id as any,
        minOrderQuantity: 10,
        leadTimeDays: 7,
        currentStock: 25,
        reorderLevel: 20,
      },
      context
    );
    const boots = await ProductService.create(
      {
        name: 'Heavy-Duty Security Patrol Boots (Size 42)',
        type: 'STOCKABLE' as any,
        category: 'Footwear',
        uom: 'PAIR',
        purchasePrice: 2400,
        salesPrice: 2900,
        defaultSupplierId: supplier._id as any,
        minOrderQuantity: 5,
        leadTimeDays: 5,
        currentStock: 10,
        reorderLevel: 15,
      },
      context
    );
    console.log(`[PASS] Products created: ${uniform.name} (${uniform.sku}), ${boots.name} (${boots.sku})`);

    console.log('[TEST] Step 3: Create RFQ');
    const rfq = await RFQService.create(
      {
        supplierId: supplier._id,
        requestingDepartment: 'Security Operations',
        paymentTerms: 'NET_30',
        deliveryTerms: 'EXW',
        currency: 'ETB',
        expectedDeliveryDate: new Date(Date.now() + 14 * 86400000),
        notes: 'Urgent procurement for newly deployed security sites',
        lines: [
          {
            productId: uniform._id,
            description: 'Uniform sets with company embroidery',
            quantity: 50,
            uom: 'SET',
            estimatedPrice: 1200,
          },
          {
            productId: boots._id,
            description: 'Steel toe waterproof patrol boots',
            quantity: 30,
            uom: 'PAIR',
            estimatedPrice: 2400,
          },
        ],
      },
      context
    );
    console.log(`[PASS] RFQ created: ${rfq.rfqNumber}, Status: ${rfq.status}, Est Total: ${rfq.totalEstimatedAmount}`);

    console.log('[TEST] Step 4: Submit and Send RFQ');
    await RFQService.submit(rfq._id.toString(), context);
    const sentRfq = await RFQService.send(rfq._id.toString(), context);
    console.log(`[PASS] RFQ status moved to: ${sentRfq.status}`);

    console.log('[TEST] Step 5: Record Vendor Quotation');
    const uniformLineId = sentRfq.lines[0]._id!.toString();
    const bootsLineId = sentRfq.lines[1]._id!.toString();

    const quotedRfq = await RFQService.recordQuotation(
      rfq._id.toString(),
      [
        { lineId: uniformLineId, vendorPrice: 1150, discount: 5, tax: 15 },
        { lineId: bootsLineId, vendorPrice: 2300, discount: 0, tax: 15 },
      ],
      context
    );
    console.log(`[PASS] RFQ quotation recorded: Total Quoted: ${quotedRfq.totalQuotedAmount}, Status: ${quotedRfq.status}`);

    console.log('[TEST] Step 6: Approve RFQ');
    const approvedRfq = await RFQService.approve(rfq._id.toString(), context);
    console.log(`[PASS] RFQ approved: Status: ${approvedRfq.status}`);

    console.log('[TEST] Step 7: Convert RFQ to Purchase Order');
    const po = await RFQService.convertToPO(rfq._id.toString(), { warehouse: 'Central Addis Warehouse' }, context);
    console.log(`[PASS] PO created from RFQ: ${po.poNumber}, Grand Total: ${po.grandTotal}, Status: ${po.status}`);

    console.log('[TEST] Step 8: Submit and Approve PO');
    await POService.submit(po._id.toString(), context);
    const approvedPo = await POService.approve(po._id.toString(), 'Approved by executive procurement review', context);
    console.log(`[PASS] PO approved: Status: ${approvedPo.status}, Approval Stage: ${approvedPo.approvalStage}`);

    console.log('[TEST] Step 9: Send PO to Vendor');
    const sentPo = await POService.send(po._id.toString(), context);
    console.log(`[PASS] PO sent to vendor: Status: ${sentPo.status}`);

    console.log('[TEST] Step 10: Partial Goods Receipt Note (GRN)');
    const partialGrn = await ReceiptService.create(
      {
        purchaseOrderId: po._id,
        warehouse: 'Central Addis Warehouse',
        vendorDeliveryNote: 'DN-2026-9901',
        lines: [
          { productId: uniform._id, receivedQuantity: 30 },
          { productId: boots._id, receivedQuantity: 15 },
        ],
      },
      context
    );
    const poAfterPartial = await POService.getById(po._id.toString());
    console.log(`[PASS] Partial GRN created: ${partialGrn.grnNumber}, PO Status: ${poAfterPartial.status}`);
    if (poAfterPartial.status !== POStatus.PARTIALLY_RECEIVED) {
      throw new Error(`Expected PARTIALLY_RECEIVED, got ${poAfterPartial.status}`);
    }

    console.log('[TEST] Step 11: Final Goods Receipt Note (GRN)');
    const finalGrn = await ReceiptService.create(
      {
        purchaseOrderId: po._id,
        warehouse: 'Central Addis Warehouse',
        vendorDeliveryNote: 'DN-2026-9902',
        lines: [
          { productId: uniform._id, receivedQuantity: 20 },
          { productId: boots._id, receivedQuantity: 15 },
        ],
      },
      context
    );
    const poAfterFinal = await POService.getById(po._id.toString());
    console.log(`[PASS] Final GRN created: ${finalGrn.grnNumber}, PO Status: ${poAfterFinal.status}`);
    if (poAfterFinal.status !== POStatus.FULLY_RECEIVED) {
      throw new Error(`Expected FULLY_RECEIVED, got ${poAfterFinal.status}`);
    }

    console.log('[TEST] Step 12: Create Supplier Bill (Invoice)');
    const bill = await BillService.create(
      {
        purchaseOrderId: po._id,
        vendorInvoiceNumber: 'INV-VIT-8831',
        dueDate: new Date(Date.now() + 30 * 86400000),
      },
      context
    );
    console.log(`[PASS] Bill created: ${bill.billNumber}, Total: ${bill.totalAmount}, Status: ${bill.status}`);

    console.log('[TEST] Step 13: Post Bill to Accounting (Journal Entry)');
    const postedBill = await BillService.postBill(bill._id.toString(), context);
    console.log(`[PASS] Bill posted: Status: ${postedBill.status}, Journal Entry: ${postedBill.journalEntryId}`);

    console.log('[TEST] Step 14: Record Payments');
    const halfAmount = Math.round((bill.totalAmount / 2) * 100) / 100;
    const billPartPaid = await BillService.recordPayment(
      bill._id.toString(),
      { amount: halfAmount, paymentMethod: 'BANK_TRANSFER', reference: 'TRX-CBE-001' },
      context
    );
    console.log(`[PASS] Recorded 50% payment: Paid: ${billPartPaid.paidAmount}, Status: ${billPartPaid.status}`);
    if (billPartPaid.status !== BillStatus.PARTIALLY_PAID) {
      throw new Error(`Expected PARTIALLY_PAID, got ${billPartPaid.status}`);
    }

    const remainingAmount = Math.round((bill.totalAmount - halfAmount) * 100) / 100;
    const billFullyPaid = await BillService.recordPayment(
      bill._id.toString(),
      { amount: remainingAmount, paymentMethod: 'BANK_TRANSFER', reference: 'TRX-CBE-002' },
      context
    );
    console.log(`[PASS] Recorded remaining payment: Paid: ${billFullyPaid.paidAmount}, Status: ${billFullyPaid.status}`);
    if (billFullyPaid.status !== BillStatus.PAID) {
      throw new Error(`Expected PAID, got ${billFullyPaid.status}`);
    }

    console.log('[TEST] Step 15: Verify Purchase Dashboard and Analytics');
    const dashboard = await PurchaseReportService.getDashboard();
    console.log('[PASS] Dashboard KPI results:', dashboard.kpis);

    const priceHistory = await PurchaseReportService.getProductPriceHistory(uniform._id.toString());
    console.log(`[PASS] Price history items found for Uniform: ${priceHistory.length}`);

    console.log('\n======================================================');
    console.log(' ALL END-TO-END PURCHASING INTEGRATION TESTS PASSED! ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('[TEST ERROR]', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
