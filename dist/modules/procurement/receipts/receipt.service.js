"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptService = void 0;
const GoodsReceipt_1 = require("../../../models/GoodsReceipt");
const PurchaseOrder_1 = require("../../../models/PurchaseOrder");
const Product_1 = require("../../../models/Product");
const AuditLog_1 = require("../../../models/AuditLog");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const numbering_service_1 = require("../common/numbering.service");
class ReceiptService {
    static async getAll(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const query = {};
        if (options.purchaseOrderId) {
            query.purchaseOrderId = options.purchaseOrderId;
        }
        if (options.supplierId) {
            query.supplierId = options.supplierId;
        }
        if (options.warehouse) {
            query.warehouse = options.warehouse;
        }
        if (options.search) {
            const searchRegex = new RegExp(options.search, 'i');
            query.$or = [
                { grnNumber: searchRegex },
                { vendorDeliveryNote: searchRegex },
            ];
        }
        const sortField = options.sort || 'createdAt';
        const sortDir = options.dir === 'asc' ? 1 : -1;
        const [data, total] = await Promise.all([
            GoodsReceipt_1.GoodsReceipt.find(query)
                .populate('supplierId', 'name code email phone')
                .populate('purchaseOrderId', 'poNumber poDate grandTotal status')
                .populate('receivedById', 'firstName lastName email')
                .populate('lines.productId', 'name sku uom')
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limit),
            GoodsReceipt_1.GoodsReceipt.countDocuments(query),
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
        const grn = await GoodsReceipt_1.GoodsReceipt.findById(id)
            .populate('supplierId', 'name code email phone address')
            .populate('purchaseOrderId', 'poNumber poDate grandTotal status paymentTerms')
            .populate('receivedById', 'firstName lastName email')
            .populate('lines.productId', 'name sku uom currentStock incomingStock');
        if (!grn) {
            throw ApiError_1.ApiError.notFound('Goods Receipt Note not found');
        }
        return grn;
    }
    static async create(data, context) {
        if (!data.purchaseOrderId) {
            throw ApiError_1.ApiError.badRequest('Purchase Order reference is required');
        }
        if (!data.lines || !Array.isArray(data.lines) || data.lines.length === 0) {
            throw ApiError_1.ApiError.badRequest('At least one receipt line item is required');
        }
        const po = await PurchaseOrder_1.PurchaseOrder.findById(data.purchaseOrderId);
        if (!po) {
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        }
        if (![types_1.POStatus.APPROVED, types_1.POStatus.SENT_TO_VENDOR, types_1.POStatus.PARTIALLY_RECEIVED].includes(po.status)) {
            throw ApiError_1.ApiError.badRequest(`Cannot receive goods for PO in status ${po.status}`);
        }
        const grnNumber = await numbering_service_1.NumberingService.getNextNumber('GRN');
        const grnLines = [];
        for (const item of data.lines) {
            const receivedQty = item.receivedQuantity || 0;
            if (receivedQty <= 0)
                continue;
            const poLine = po.lines.find((l) => l.productId.toString() === item.productId.toString());
            if (!poLine) {
                throw ApiError_1.ApiError.badRequest(`Product ${item.productId} is not part of Purchase Order ${po.poNumber}`);
            }
            const previouslyReceived = poLine.receivedQuantity || 0;
            const remainingBefore = Math.max(0, poLine.quantity - previouslyReceived);
            if (receivedQty > remainingBefore) {
                throw ApiError_1.ApiError.badRequest(`Received quantity (${receivedQty}) exceeds remaining ordered quantity (${remainingBefore}) for product`);
            }
            const remainingAfter = remainingBefore - receivedQty;
            poLine.receivedQuantity = previouslyReceived + receivedQty;
            grnLines.push({
                productId: poLine.productId,
                orderedQuantity: poLine.quantity,
                previouslyReceived,
                receivedQuantity: receivedQty,
                remainingQuantity: remainingAfter,
                rejectedQuantity: item.rejectedQuantity || 0,
                rejectionReason: item.rejectionReason,
                notes: item.notes,
            });
            // Update product inventory
            await Product_1.Product.findByIdAndUpdate(poLine.productId, {
                $inc: {
                    currentStock: receivedQty,
                    incomingStock: -receivedQty,
                },
            });
        }
        if (grnLines.length === 0) {
            throw ApiError_1.ApiError.badRequest('No valid received quantities provided');
        }
        // Determine new PO status
        const allFullyReceived = po.lines.every((l) => (l.receivedQuantity || 0) >= l.quantity);
        po.status = allFullyReceived ? types_1.POStatus.FULLY_RECEIVED : types_1.POStatus.PARTIALLY_RECEIVED;
        await po.save();
        const grn = await GoodsReceipt_1.GoodsReceipt.create({
            grnNumber,
            receiptDate: data.receiptDate || new Date(),
            purchaseOrderId: po._id,
            supplierId: po.supplierId,
            warehouse: data.warehouse || po.warehouse || 'Main Warehouse',
            receivedById: data.receivedById || context.userId,
            vendorDeliveryNote: data.vendorDeliveryNote,
            status: types_1.GRNStatus.CONFIRMED,
            notes: data.notes,
            lines: grnLines,
        });
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'GRN_CREATE',
                entity: 'GoodsReceipt',
                entityId: grn._id,
                newValues: { grnNumber, poNumber: po.poNumber, poStatus: po.status },
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return grn;
    }
}
exports.ReceiptService = ReceiptService;
//# sourceMappingURL=receipt.service.js.map