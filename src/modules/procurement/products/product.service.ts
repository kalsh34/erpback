import { Product, IProduct } from '../../../models/Product';
import { PurchaseOrder } from '../../../models/PurchaseOrder';
import { AuditLog } from '../../../models/AuditLog';
import { ApiError } from '../../../common/ApiError';
import { NumberingService } from '../common/numbering.service';

interface ProductQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  category?: string;
  supplierId?: string;
  lowStock?: boolean | string;
  status?: string;
  sort?: string;
  dir?: string;
}

export class ProductService {
  static async getAll(options: ProductQueryOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

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
      Product.find(query)
        .populate('defaultSupplierId', 'name code email phone')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
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
    const product = await Product.findById(id).populate('defaultSupplierId', 'name code email phone supplierRating');
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Historical purchase price trend from PO lines
    const purchaseHistory = await PurchaseOrder.aggregate([
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

  static async create(data: Partial<IProduct>, context: { userId?: string; ip?: string; ua?: string }) {
    if (!data.name) {
      throw ApiError.badRequest('Product name is required');
    }

    if (!data.sku) {
      data.sku = await NumberingService.getNextNumber('PRODUCT');
    }

    const existing = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Product with SKU ${data.sku} already exists`);
    }

    const product = await Product.create({
      ...data,
      sku: data.sku.toUpperCase(),
    });

    if (context.userId) {
      await AuditLog.create({
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

  static async update(id: string, data: Partial<IProduct>, context: { userId?: string; ip?: string; ua?: string }) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const oldValues = product.toObject();

    Object.assign(product, data);
    await product.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async delete(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Check if POs exist with this product
    const poUsing = await PurchaseOrder.findOne({ 'lines.productId': id });
    if (poUsing) {
      product.isActive = false;
      await product.save();
    } else {
      await Product.findByIdAndDelete(id);
    }

    if (context.userId) {
      await AuditLog.create({
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
