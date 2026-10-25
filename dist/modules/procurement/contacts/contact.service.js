"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const Contact_1 = require("../../../models/Contact");
const PurchaseOrder_1 = require("../../../models/PurchaseOrder");
const AuditLog_1 = require("../../../models/AuditLog");
const ApiError_1 = require("../../../common/ApiError");
const numbering_service_1 = require("../common/numbering.service");
class ContactService {
    static async getAll(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const query = {};
        if (options.isSupplier !== undefined) {
            query.isSupplier = options.isSupplier === true || options.isSupplier === 'true';
        }
        if (options.isCustomer !== undefined) {
            query.isCustomer = options.isCustomer === true || options.isCustomer === 'true';
        }
        if (options.category) {
            query.supplierCategory = options.category;
        }
        if (options.status) {
            query.isActive = options.status === 'ACTIVE';
        }
        if (options.search) {
            const searchRegex = new RegExp(options.search, 'i');
            query.$or = [
                { name: searchRegex },
                { code: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { tin: searchRegex },
            ];
        }
        const sortField = options.sort || 'createdAt';
        const sortDir = options.dir === 'asc' ? 1 : -1;
        const [data, total] = await Promise.all([
            Contact_1.Contact.find(query)
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limit),
            Contact_1.Contact.countDocuments(query),
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
        const contact = await Contact_1.Contact.findById(id).populate('preferredProductIds', 'sku name category uom purchasePrice');
        if (!contact) {
            throw ApiError_1.ApiError.notFound('Contact not found');
        }
        // Fetch recent purchase orders
        const recentOrders = await PurchaseOrder_1.PurchaseOrder.find({ supplierId: id })
            .sort({ poDate: -1 })
            .limit(10)
            .select('poNumber poDate grandTotal status createdAt');
        return {
            contact,
            recentOrders,
        };
    }
    static async create(data, context) {
        if (!data.name) {
            throw ApiError_1.ApiError.badRequest('Contact name is required');
        }
        if (!data.code) {
            data.code = await numbering_service_1.NumberingService.getNextNumber('CONTACT');
        }
        const existing = await Contact_1.Contact.findOne({ code: data.code.toUpperCase() });
        if (existing) {
            throw ApiError_1.ApiError.conflict(`Contact with code ${data.code} already exists`);
        }
        const contact = await Contact_1.Contact.create({
            ...data,
            code: data.code.toUpperCase(),
        });
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'CONTACT_CREATE',
                entity: 'Contact',
                entityId: contact._id,
                newValues: contact.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return contact;
    }
    static async update(id, data, context) {
        const contact = await Contact_1.Contact.findById(id);
        if (!contact) {
            throw ApiError_1.ApiError.notFound('Contact not found');
        }
        const oldValues = contact.toObject();
        Object.assign(contact, data);
        await contact.save();
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'CONTACT_UPDATE',
                entity: 'Contact',
                entityId: contact._id,
                oldValues,
                newValues: contact.toObject(),
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return contact;
    }
    static async delete(id, context) {
        const contact = await Contact_1.Contact.findById(id);
        if (!contact) {
            throw ApiError_1.ApiError.notFound('Contact not found');
        }
        // Check if purchase orders exist
        const orderCount = await PurchaseOrder_1.PurchaseOrder.countDocuments({ supplierId: id });
        if (orderCount > 0) {
            // Soft deactivate
            contact.isActive = false;
            await contact.save();
        }
        else {
            await Contact_1.Contact.findByIdAndDelete(id);
        }
        if (context.userId) {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: 'CONTACT_DELETE',
                entity: 'Contact',
                entityId: contact._id,
                reason: orderCount > 0 ? 'Deactivated due to existing purchase history' : 'Hard deleted',
                ipAddress: context.ip,
                userAgent: context.ua,
            });
        }
        return { success: true, message: orderCount > 0 ? 'Contact deactivated' : 'Contact removed' };
    }
}
exports.ContactService = ContactService;
//# sourceMappingURL=contact.service.js.map