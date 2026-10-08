import { Contact, IContact } from '../../../models/Contact';
import { PurchaseOrder } from '../../../models/PurchaseOrder';
import { AuditLog } from '../../../models/AuditLog';
import { ApiError } from '../../../common/ApiError';
import { NumberingService } from '../common/numbering.service';

interface QueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  isSupplier?: boolean | string;
  isCustomer?: boolean | string;
  category?: string;
  status?: string;
  sort?: string;
  dir?: string;
}

export class ContactService {
  static async getAll(options: QueryOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

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
      Contact.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      Contact.countDocuments(query),
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

  static async getById(id: string) {
    const contact = await Contact.findById(id).populate('preferredProductIds', 'sku name category uom purchasePrice');
    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    // Fetch recent purchase orders
    const recentOrders = await PurchaseOrder.find({ supplierId: id })
      .sort({ poDate: -1 })
      .limit(10)
      .select('poNumber poDate grandTotal status createdAt');

    return {
      contact,
      recentOrders,
    };
  }

  static async create(data: Partial<IContact>, context: { userId?: string; ip?: string; ua?: string }) {
    if (!data.name) {
      throw ApiError.badRequest('Contact name is required');
    }

    if (!data.code) {
      data.code = await NumberingService.getNextNumber('CONTACT');
    }

    const existing = await Contact.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Contact with code ${data.code} already exists`);
    }

    const contact = await Contact.create({
      ...data,
      code: data.code.toUpperCase(),
    });

    if (context.userId) {
      await AuditLog.create({
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

  static async update(id: string, data: Partial<IContact>, context: { userId?: string; ip?: string; ua?: string }) {
    const contact = await Contact.findById(id);
    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    const oldValues = contact.toObject();

    Object.assign(contact, data);
    await contact.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async delete(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const contact = await Contact.findById(id);
    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    // Check if purchase orders exist
    const orderCount = await PurchaseOrder.countDocuments({ supplierId: id });
    if (orderCount > 0) {
      // Soft deactivate
      contact.isActive = false;
      await contact.save();
    } else {
      await Contact.findByIdAndDelete(id);
    }

    if (context.userId) {
      await AuditLog.create({
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
