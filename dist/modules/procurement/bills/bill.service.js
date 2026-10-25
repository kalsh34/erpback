"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillService = void 0;
const SupplierInvoice_1 = require("../../../models/SupplierInvoice");
const PurchaseOrder_1 = require("../../../models/PurchaseOrder");
const JournalEntry_1 = require("../../../models/JournalEntry");
const AuditLog_1 = require("../../../models/AuditLog");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const numbering_service_1 = require("../common/numbering.service");
class BillService {
    static async getAll(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const query = {};
        if (options.status) {
            query.status = options.status;
        }
        if (options.supplierId) {
            query.supplierId = options.supplierId;
        }
        if (options.purchaseOrderId) {
            query.purchaseOrderId = options.purchaseOrderId;
        }
        if (options.search) {
            const searchRegex = new RegExp(options.search, 'i');
            query.$or = [
                { billNumber: searchRegex },
                { vendorInvoiceNumber: searchRegex },
            ];
        }
        const sortField = options.sort || 'createdAt';
        const sortDir = options.dir === 'asc' ? 1 : -1;
        const [data, total] = await Promise.all([
            SupplierInvoice_1.SupplierInvoice.find(query)
                .populate('supplierId', 'name code email phone')
                .populate('purchaseOrderId', 'poNumber poDate grandTotal status')
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limit),
            SupplierInvoice_1.SupplierInvoice.countDocuments(query),
        ]);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    static async getById(id) {
        const bill = await SupplierInvoice_1.SupplierInvoice.findById(id)
            .populate('supplierId', 'name code email phone address city paymentTerms currency tin bankInfo')
            .populate('purchaseOrderId', 'poNumber poDate grandTotal status department warehouse')
            .populate('goodsReceiptId', 'grnNumber receiptDate status')
            .populate('payments.recordedById', 'firstName lastName email')
            .populate('journalEntryId', 'entryNumber status totalDebit totalCredit');
        if (!bill) {
            throw ApiError_1.ApiError.notFound('Supplier Bill not found');
        }
        return bill;
    }
    static async create(data, context) {
        if (!data.purchaseOrderId) {
            throw ApiError_1.ApiError.badRequest('Purchase Order reference is required');
        }
        const po = await PurchaseOrder_1.PurchaseOrder.findById(data.purchaseOrderId);
        if (!po) {
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        }
        const billNumber = await numbering_service_1.NumberingService.getNextNumber('BILL');
        const subtotal = data.subtotal !== undefined ? data.subtotal : po.subtotal - po.totalDiscount;
        const taxAmount = data.taxAmount !== undefined ? data.taxAmount : po.totalTax;
        const totalAmount = data.totalAmount !== undefined ? data.totalAmount : po.grandTotal;
        const bill = await SupplierInvoice_1.SupplierInvoice.create({
            billNumber,
            vendorInvoiceNumber: data.vendorInvoiceNumber,
            billDate: data.billDate || new Date(),
            dueDate: data.dueDate,
            purchaseOrderId: po._id,
            goodsReceiptId: data.goodsReceiptId || null,
            supplierId: po.supplierId,
            currency: po.currency,
            subtotal,
            taxAmount,
            totalAmount,
            paidAmount: 0,
            status: types_1.BillStatus.DRAFT,
            notes: data.notes,
            payments: [],
        });
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'BILL_CREATE',
                entity: 'SupplierInvoice',
                entityId: bill._id,
                newValues: { billNumber, poNumber: po.poNumber, totalAmount },
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return bill;
    }
    static async postBill(id, context) {
        const bill = await SupplierInvoice_1.SupplierInvoice.findById(id).populate('supplierId', 'name code');
        if (!bill)
            throw ApiError_1.ApiError.notFound('Supplier Bill not found');
        if (bill.status !== types_1.BillStatus.DRAFT) {
            throw ApiError_1.ApiError.badRequest(`Cannot post bill in status ${bill.status}`);
        }
        // Create Accounting Journal Entry (debit Inventory / Expense, credit Accounts Payable)
        const entryCount = await JournalEntry_1.JournalEntry.countDocuments();
        const entryNumber = `JE-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;
        const journal = await JournalEntry_1.JournalEntry.create({
            entryNumber,
            entryDate: bill.billDate || new Date(),
            entryType: 'MANUAL',
            status: 'POSTED',
            description: `Purchase Bill ${bill.billNumber} - ${bill.supplierId?.name || 'Supplier'}`,
            reference: bill.billNumber,
            referenceModel: 'SupplierInvoice',
            referenceId: bill._id,
            lines: [
                {
                    accountCode: '1300',
                    accountName: 'Inventory & Supplies',
                    description: `Bill ${bill.billNumber} Inventory/Expense`,
                    debit: bill.totalAmount,
                    credit: 0,
                },
                {
                    accountCode: '2000',
                    accountName: 'Accounts Payable',
                    description: `AP Liability for Bill ${bill.billNumber}`,
                    debit: 0,
                    credit: bill.totalAmount,
                },
            ],
            totalDebit: bill.totalAmount,
            totalCredit: bill.totalAmount,
            postedBy: context.userId,
            postedAt: new Date(),
        });
        bill.status = types_1.BillStatus.POSTED;
        bill.journalEntryId = journal._id;
        await bill.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'BILL_POSTED',
                entity: 'SupplierInvoice',
                entityId: bill._id,
                newValues: { status: bill.status, journalEntryId: journal._id },
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return bill;
    }
    static async recordPayment(id, paymentData, context) {
        const bill = await SupplierInvoice_1.SupplierInvoice.findById(id);
        if (!bill)
            throw ApiError_1.ApiError.notFound('Supplier Bill not found');
        const paymentAmount = Number(paymentData.amount);
        if (!paymentAmount || paymentAmount <= 0) {
            throw ApiError_1.ApiError.badRequest('Payment amount must be greater than 0');
        }
        const remainingDue = bill.totalAmount - bill.paidAmount;
        if (paymentAmount > remainingDue) {
            throw ApiError_1.ApiError.badRequest(`Payment amount (${paymentAmount}) exceeds remaining balance (${remainingDue})`);
        }
        const newPayment = {
            paymentDate: paymentData.paymentDate || new Date(),
            amount: paymentAmount,
            paymentMethod: paymentData.paymentMethod || 'BANK_TRANSFER',
            reference: paymentData.reference,
            notes: paymentData.notes,
            recordedById: context.userId,
        };
        bill.payments.push(newPayment);
        bill.paidAmount = Math.round((bill.paidAmount + paymentAmount) * 100) / 100;
        if (bill.paidAmount >= bill.totalAmount) {
            bill.status = types_1.BillStatus.PAID;
        }
        else {
            bill.status = types_1.BillStatus.PARTIALLY_PAID;
        }
        await bill.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'BILL_PAYMENT_RECORDED',
                entity: 'SupplierInvoice',
                entityId: bill._id,
                newValues: { paidAmount: bill.paidAmount, status: bill.status, payment: newPayment },
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return bill;
    }
}
exports.BillService = BillService;
//# sourceMappingURL=bill.service.js.map