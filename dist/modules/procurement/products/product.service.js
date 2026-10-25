"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const Product_1 = require("../../../models/Product");
const PurchaseOrder_1 = require("../../../models/PurchaseOrder");
const AuditLog_1 = require("../../../models/AuditLog");
const ApiError_1 = require("../../../common/ApiError");
const numbering_service_1 = require("../common/numbering.service");
class ProductService {
    static async getAll(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const query = {};
        if (options.type) {
            query.type = options.type;
        }
        if (options.category) {
            query.category = options.category;
        }
        if (options.supplierId) {
            query.defaultSupplierId = options.supplierId;
        }
        if (options.status) {
            query.isActive = options.status === 'ACTIVE';
        }
        if (options.lowStock === true || options.lowStock === 'true') {
            query.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
        }
        if (options.search) {
            const searchRegex = new RegExp(options.search, 'i');
            query.$or = [
                { name: searchRegex },
                { sku: searchRegex },
                { barcode: searchRegex },
                { category: searchRegex },
            ];
        }
        const sortField = options.sort || 'name';
        const sortDir = options.dir === 'desc' ? -1 : 1;
        const [data, total] = await Promise.all([
            Product_1.Product.find(query)
                .populate('defaultSupplierId', 'name code email phone')
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limit),
            Product_1.Product.countDocuments(query),
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
        const product = await Product_1.Product.findById(id).populate('defaultSupplierId', 'name code email phone supplierRating');
        if (!product) {
            throw ApiError_1.ApiError.notFound('Product not found');
        }
        // Historical purchase price trend from PO lines
        const purchaseHistory = await PurchaseOrder_1.PurchaseOrder.aggregate([
            { $unwind: '$lines' },
            { $match: { 'lines.productId': product._id, status: { $in: ['APPROVED', 'SENT_TO_VENDOR', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED'] } } },
            {
                $lookup: {
                    from: 'contacts',
                    localField: 'supplierId',
                    foreignField: '_id',
                    as: 'supplier',
                },
            },
            { $unwind: '$supplier' },
            {
                $project: {
                    poNumber: '$poNumber',
                    poDate: '$poDate',
                    supplierName: '$supplier.name',
                    quantity: '$lines.quantity',
                    unitPrice: '$lines.unitPrice',
                    currency: '$currency',
                },
            },
            { $sort: { poDate: -1 } },
            { $limit: 15 },
        ]);
        return {
            product,
            purchaseHistory,
        };
    }
    static async create(data, context) {
        if (!data.name) {
            throw ApiError_1.ApiError.badRequest('Product name is required');
        }
        if (!data.sku) {
            data.sku = await numbering_service_1.NumberingService.getNextNumber('PRODUCT');
        }
        const existing = await Product_1.Product.findOne({ sku: data.sku.toUpperCase() });
        if (existing) {
            throw ApiError_1.ApiError.conflict(`Product with SKU ${data.sku} already exists`);
        }
        const product = await Product_1.Product.create({
            ...data,
            sku: data.sku.toUpperCase(),
        });
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PRODUCT_CREATE',
                entity: 'Product',
                entityId: product._id,
                newValues: product.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return product;
    }
    static async update(id, data, context) {
        const product = await Product_1.Product.findById(id);
        if (!product) {
            throw ApiError_1.ApiError.notFound('Product not found');
        }
        const oldValues = product.toObject();
        Object.assign(product, data);
        await product.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PRODUCT_UPDATE',
                entity: 'Product',
                entityId: product._id,
                oldValues,
                newValues: product.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return product;
    }
    static async delete(id, context) {
        const product = await Product_1.Product.findById(id);
        if (!product) {
            throw ApiError_1.ApiError.notFound('Product not found');
        }
        // Check if POs exist with this product
        const poUsing = await PurchaseOrder_1.PurchaseOrder.findOne({ 'lines.productId': id });
        if (poUsing) {
            product.isActive = false;
            await product.save();
        }
        else {
            await Product_1.Product.findByIdAndDelete(id);
        }
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'PRODUCT_DELETE',
                entity: 'Product',
                entityId: product._id,
                reason: poUsing ? 'Deactivated due to historical purchase order references' : 'Hard deleted',
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return { success: true, message: poUsing ? 'Product deactivated' : 'Product removed' };
    }
}
exports.ProductService = ProductService;
//# sourceMappingURL=product.service.js.map