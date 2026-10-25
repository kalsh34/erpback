"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POService = void 0;
const PurchaseOrder_1 = require("../../../models/PurchaseOrder");
const Product_1 = require("../../../models/Product");
const Contact_1 = require("../../../models/Contact");
const User_1 = require("../../../models/User");
const PurchaseSettings_1 = require("../../../models/PurchaseSettings");
const AuditLog_1 = require("../../../models/AuditLog");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const numbering_service_1 = require("../common/numbering.service");
class POService {
    static calculateTotals(lines) {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        const formattedLines = lines.map((l) => {
            const qty = l.quantity || 0;
            const price = l.unitPrice || 0;
            const discountPct = l.discount || 0;
            const taxPct = l.tax !== undefined ? l.tax : 15;
            const baseAmount = qty * price;
            const discountAmount = baseAmount * (discountPct / 100);
            const afterDiscount = baseAmount - discountAmount;
            const taxAmount = afterDiscount * (taxPct / 100);
            const lineSubtotal = Math.round((afterDiscount + taxAmount) * 100) / 100;
            subtotal += baseAmount;
            totalDiscount += discountAmount;
            totalTax += taxAmount;
            return {
                productId: l.productId,
                supplierProductCode: l.supplierProductCode,
                description: l.description,
                quantity: qty,
                uom: l.uom || 'PCS',
                unitPrice: price,
                discount: discountPct,
                tax: taxPct,
                subtotal: lineSubtotal,
                expectedDeliveryDate: l.expectedDeliveryDate,
                warehouse: l.warehouse || 'Main Warehouse',
                receivedQuantity: l.receivedQuantity || 0,
            };
        });
        const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;
        return {
            lines: formattedLines,
            subtotal: Math.round(subtotal * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            grandTotal,
        };
    }
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
        if (options.buyerId) {
            query.buyerId = options.buyerId;
        }
        if (options.department) {
            query.department = options.department;
        }
        if (options.search) {
            const searchRegex = new RegExp(options.search, 'i');
            query.$or = [
                { poNumber: searchRegex },
                { reference: searchRegex },
                { department: searchRegex },
            ];
        }
        const sortField = options.sort || 'createdAt';
        const sortDir = options.dir === 'asc' ? 1 : -1;
        const [data, total] = await Promise.all([
            PurchaseOrder_1.PurchaseOrder.find(query)
                .populate('supplierId', 'name code email phone')
                .populate('buyerId', 'firstName lastName email')
                .populate('lines.productId', 'name sku uom')
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limit),
            PurchaseOrder_1.PurchaseOrder.countDocuments(query),
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
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id)
            .populate('supplierId', 'name code email phone address city paymentTerms currency deliveryTerms tin')
            .populate('buyerId', 'firstName lastName email')
            .populate('lines.productId', 'name sku uom currentStock incomingStock')
            .populate('rfqId', 'rfqNumber status totalQuotedAmount')
            .populate('approvalHistory.userId', 'firstName lastName email role');
        if (!po) {
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        }
        return po;
    }
    static async create(data, context) {
        if (!data.supplierId) {
            throw ApiError_1.ApiError.badRequest('Supplier is required');
        }
        if (!data.lines || !Array.isArray(data.lines) || data.lines.length === 0) {
            throw ApiError_1.ApiError.badRequest('At least one line item is required');
        }
        const poNumber = await numbering_service_1.NumberingService.getNextNumber('PO');
        const { lines, subtotal, totalDiscount, totalTax, grandTotal } = this.calculateTotals(data.lines);
        const po = await PurchaseOrder_1.PurchaseOrder.create({
            ...data,
            poNumber,
            buyerId: data.buyerId || context.userId,
            lines,
            subtotal,
            totalDiscount,
            totalTax,
            grandTotal,
            status: types_1.POStatus.DRAFT,
            approvalStage: 'DRAFT',
            revisionNumber: 0,
            revisions: [],
        });
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_CREATE',
                entity: 'PurchaseOrder',
                entityId: po._id,
                newValues: po.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
    static async update(id, data, context) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id);
        if (!po) {
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        }
        if (po.status !== types_1.POStatus.DRAFT) {
            throw ApiError_1.ApiError.badRequest(`Cannot directly edit PO in status ${po.status}. Use Revision workflow instead.`);
        }
        const oldValues = po.toObject();
        if (data.lines && Array.isArray(data.lines)) {
            const { lines, subtotal, totalDiscount, totalTax, grandTotal } = this.calculateTotals(data.lines);
            po.lines = lines;
            po.subtotal = subtotal;
            po.totalDiscount = totalDiscount;
            po.totalTax = totalTax;
            po.grandTotal = grandTotal;
        }
        if (data.supplierId !== undefined)
            po.supplierId = data.supplierId;
        if (data.department !== undefined)
            po.department = data.department;
        if (data.paymentTerms !== undefined)
            po.paymentTerms = data.paymentTerms;
        if (data.deliveryTerms !== undefined)
            po.deliveryTerms = data.deliveryTerms;
        if (data.expectedDeliveryDate !== undefined)
            po.expectedDeliveryDate = data.expectedDeliveryDate;
        if (data.warehouse !== undefined)
            po.warehouse = data.warehouse;
        if (data.reference !== undefined)
            po.reference = data.reference;
        if (data.notes !== undefined)
            po.notes = data.notes;
        if (data.termsAndConditions !== undefined)
            po.termsAndConditions = data.termsAndConditions;
        await po.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_UPDATE',
                entity: 'PurchaseOrder',
                entityId: po._id,
                oldValues,
                newValues: po.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
    static async submit(id, context) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id);
        if (!po)
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        if (po.status !== types_1.POStatus.DRAFT && po.status !== types_1.POStatus.REJECTED) {
            throw ApiError_1.ApiError.badRequest(`Cannot submit PO in status ${po.status}`);
        }
        po.status = types_1.POStatus.SUBMITTED;
        po.approvalStage = 'PENDING_APPROVAL';
        await po.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_SUBMIT',
                entity: 'PurchaseOrder',
                entityId: po._id,
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
    static async approve(id, comments, context) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id);
        if (!po)
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        if (po.status !== types_1.POStatus.SUBMITTED) {
            throw ApiError_1.ApiError.badRequest(`Cannot approve PO in status ${po.status}`);
        }
        const user = context.userId ? await User_1.User.findById(context.userId) : null;
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Approver';
        const role = context.userRole || user?.role || 'APPROVER';
        // Record approval step
        po.approvalHistory.push({
            role,
            userId: context.userId || user?._id,
            userName,
            action: 'APPROVED',
            comments: comments || 'Approved',
            timestamp: new Date(),
        });
        // Check approval threshold
        let settings = await PurchaseSettings_1.PurchaseSettings.findOne();
        if (!settings)
            settings = await PurchaseSettings_1.PurchaseSettings.create({});
        const amount = po.grandTotal;
        const isExecutive = [types_1.UserRole.CEO, types_1.UserRole.SUPER_ADMIN].includes(role);
        if (isExecutive || amount < 50000 || (amount < 500000 && [types_1.UserRole.FINANCE_OFFICER, types_1.UserRole.CEO, types_1.UserRole.SUPER_ADMIN].includes(role))) {
            po.status = types_1.POStatus.APPROVED;
            po.approvalStage = 'FULLY_APPROVED';
            // Update incoming stock on products
            for (const line of po.lines) {
                await Product_1.Product.findByIdAndUpdate(line.productId, {
                    $inc: { incomingStock: line.quantity },
                });
            }
            // Update supplier purchase stats
            await Contact_1.Contact.findByIdAndUpdate(po.supplierId, {
                $inc: { totalPurchaseSpend: po.grandTotal, totalOrdersCount: 1 },
            });
        }
        else {
            po.approvalStage = 'PENDING_FINAL_APPROVAL';
        }
        await po.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_APPROVE',
                entity: 'PurchaseOrder',
                entityId: po._id,
                newValues: { status: po.status, approvalStage: po.approvalStage },
                reason: comments,
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
    static async reject(id, comments, context) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id);
        if (!po)
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        const user = context.userId ? await User_1.User.findById(context.userId) : null;
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Rejecter';
        const role = context.userRole || user?.role || 'APPROVER';
        po.approvalHistory.push({
            role,
            userId: context.userId || user?._id,
            userName,
            action: 'REJECTED',
            comments: comments || 'Rejected',
            timestamp: new Date(),
        });
        po.status = types_1.POStatus.REJECTED;
        po.approvalStage = 'REJECTED';
        await po.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_REJECT',
                entity: 'PurchaseOrder',
                entityId: po._id,
                reason: comments,
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
    static async send(id, context) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id);
        if (!po)
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        if (po.status !== types_1.POStatus.APPROVED && po.status !== types_1.POStatus.PARTIALLY_RECEIVED) {
            throw ApiError_1.ApiError.badRequest('PO must be approved before sending to vendor');
        }
        po.status = po.status === types_1.POStatus.PARTIALLY_RECEIVED ? po.status : types_1.POStatus.SENT_TO_VENDOR;
        po.sentToVendorAt = new Date();
        await po.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_SENT_TO_VENDOR',
                entity: 'PurchaseOrder',
                entityId: po._id,
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
    static async revise(id, data, context) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(id);
        if (!po)
            throw ApiError_1.ApiError.notFound('Purchase Order not found');
        if (!data.reason) {
            throw ApiError_1.ApiError.badRequest('Reason for revision is required');
        }
        const user = context.userId ? await User_1.User.findById(context.userId) : null;
        const userName = user ? `${user.firstName} ${user.lastName}` : 'System User';
        // Snapshot current state
        po.revisions.push({
            revisionNumber: po.revisionNumber,
            revisedAt: new Date(),
            revisedById: context.userId || user?._id,
            revisedByName: userName,
            reason: data.reason,
            snapshot: {
                lines: po.lines,
                subtotal: po.subtotal,
                totalTax: po.totalTax,
                grandTotal: po.grandTotal,
                expectedDeliveryDate: po.expectedDeliveryDate,
            },
        });
        po.revisionNumber += 1;
        if (data.lines && Array.isArray(data.lines)) {
            const { lines, subtotal, totalDiscount, totalTax, grandTotal } = this.calculateTotals(data.lines);
            po.lines = lines;
            po.subtotal = subtotal;
            po.totalDiscount = totalDiscount;
            po.totalTax = totalTax;
            po.grandTotal = grandTotal;
        }
        if (data.expectedDeliveryDate) {
            po.expectedDeliveryDate = data.expectedDeliveryDate;
        }
        await po.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PO_REVISED',
                entity: 'PurchaseOrder',
                entityId: po._id,
                reason: data.reason,
                newValues: { revisionNumber: po.revisionNumber, grandTotal: po.grandTotal },
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return po;
    }
}
exports.POService = POService;
//# sourceMappingURL=po.service.js.map