import { PurchaseOrder, IPurchaseOrder, IPOLine } from '../../../models/PurchaseOrder';
import { Product } from '../../../models/Product';
import { Contact } from '../../../models/Contact';
import { User } from '../../../models/User';
import { PurchaseSettings } from '../../../models/PurchaseSettings';
import { AuditLog } from '../../../models/AuditLog';
import { ApiError } from '../../../common/ApiError';
import { POStatus, UserRole } from '../../../types';
import { NumberingService } from '../common/numbering.service';

interface POQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: string;
  buyerId?: string;
  department?: string;
  search?: string;
  sort?: string;
  dir?: string;
}

export class POService {
  private static calculateTotals(lines: Partial<IPOLine>[]) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const formattedLines: IPOLine[] = lines.map((l) => {
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
        productId: l.productId!,
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

  static async getAll(options: POQueryOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

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
      PurchaseOrder.find(query)
        .populate('supplierId', 'name code email phone')
        .populate('buyerId', 'firstName lastName email')
        .populate('lines.productId', 'name sku uom')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      PurchaseOrder.countDocuments(query),
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
    const po = await PurchaseOrder.findById(id)
      .populate('supplierId', 'name code email phone address city paymentTerms currency deliveryTerms tin')
      .populate('buyerId', 'firstName lastName email')
      .populate('lines.productId', 'name sku uom currentStock incomingStock')
      .populate('rfqId', 'rfqNumber status totalQuotedAmount')
      .populate('approvalHistory.userId', 'firstName lastName email role');

    if (!po) {
      throw ApiError.notFound('Purchase Order not found');
    }

    return po;
  }

  static async create(data: any, context: { userId?: string; ip?: string; ua?: string }) {
    if (!data.supplierId) {
      throw ApiError.badRequest('Supplier is required');
    }
    if (!data.lines || !Array.isArray(data.lines) || data.lines.length === 0) {
      throw ApiError.badRequest('At least one line item is required');
    }

    const poNumber = await NumberingService.getNextNumber('PO');
    const { lines, subtotal, totalDiscount, totalTax, grandTotal } = this.calculateTotals(data.lines);

    const po = await PurchaseOrder.create({
      ...data,
      poNumber,
      buyerId: data.buyerId || context.userId,
      lines,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      status: POStatus.DRAFT,
      approvalStage: 'DRAFT',
      revisionNumber: 0,
      revisions: [],
    });

    if (context.userId) {
      await AuditLog.create({
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

  static async update(id: string, data: any, context: { userId?: string; ip?: string; ua?: string }) {
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      throw ApiError.notFound('Purchase Order not found');
    }

    if (po.status !== POStatus.DRAFT) {
      throw ApiError.badRequest(`Cannot directly edit PO in status ${po.status}. Use Revision workflow instead.`);
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

    if (data.supplierId !== undefined) po.supplierId = data.supplierId;
    if (data.department !== undefined) po.department = data.department;
    if (data.paymentTerms !== undefined) po.paymentTerms = data.paymentTerms;
    if (data.deliveryTerms !== undefined) po.deliveryTerms = data.deliveryTerms;
    if (data.expectedDeliveryDate !== undefined) po.expectedDeliveryDate = data.expectedDeliveryDate;
    if (data.warehouse !== undefined) po.warehouse = data.warehouse;
    if (data.reference !== undefined) po.reference = data.reference;
    if (data.notes !== undefined) po.notes = data.notes;
    if (data.termsAndConditions !== undefined) po.termsAndConditions = data.termsAndConditions;

    await po.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async submit(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw ApiError.notFound('Purchase Order not found');

    if (po.status !== POStatus.DRAFT && po.status !== POStatus.REJECTED) {
      throw ApiError.badRequest(`Cannot submit PO in status ${po.status}`);
    }

    po.status = POStatus.SUBMITTED;
    po.approvalStage = 'PENDING_APPROVAL';
    await po.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async approve(id: string, comments: string, context: { userId?: string; userRole?: string; ip?: string; ua?: string }) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw ApiError.notFound('Purchase Order not found');

    if (po.status !== POStatus.SUBMITTED) {
      throw ApiError.badRequest(`Cannot approve PO in status ${po.status}`);
    }

    const user = context.userId ? await User.findById(context.userId) : null;
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Approver';
    const role = context.userRole || user?.role || 'APPROVER';

    // Record approval step
    po.approvalHistory.push({
      role,
      userId: (context.userId as any) || (user?._id as any),
      userName,
      action: 'APPROVED',
      comments: comments || 'Approved',
      timestamp: new Date(),
    });

    // Check approval threshold
    let settings = await PurchaseSettings.findOne();
    if (!settings) settings = await PurchaseSettings.create({});

    const amount = po.grandTotal;
    const isExecutive = [UserRole.CEO, UserRole.SUPER_ADMIN].includes(role as UserRole);

    if (isExecutive || amount < 50000 || (amount < 500000 && [UserRole.FINANCE_OFFICER, UserRole.CEO, UserRole.SUPER_ADMIN].includes(role as UserRole))) {
      po.status = POStatus.APPROVED;
      po.approvalStage = 'FULLY_APPROVED';

      // Update incoming stock on products
      for (const line of po.lines) {
        await Product.findByIdAndUpdate(line.productId, {
          $inc: { incomingStock: line.quantity },
        });
      }

      // Update supplier purchase stats
      await Contact.findByIdAndUpdate(po.supplierId, {
        $inc: { totalPurchaseSpend: po.grandTotal, totalOrdersCount: 1 },
      });
    } else {
      po.approvalStage = 'PENDING_FINAL_APPROVAL';
    }

    await po.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async reject(id: string, comments: string, context: { userId?: string; userRole?: string; ip?: string; ua?: string }) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw ApiError.notFound('Purchase Order not found');

    const user = context.userId ? await User.findById(context.userId) : null;
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Rejecter';
    const role = context.userRole || user?.role || 'APPROVER';

    po.approvalHistory.push({
      role,
      userId: (context.userId as any) || (user?._id as any),
      userName,
      action: 'REJECTED',
      comments: comments || 'Rejected',
      timestamp: new Date(),
    });

    po.status = POStatus.REJECTED;
    po.approvalStage = 'REJECTED';
    await po.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async send(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw ApiError.notFound('Purchase Order not found');

    if (po.status !== POStatus.APPROVED && po.status !== POStatus.PARTIALLY_RECEIVED) {
      throw ApiError.badRequest('PO must be approved before sending to vendor');
    }

    po.status = po.status === POStatus.PARTIALLY_RECEIVED ? po.status : POStatus.SENT_TO_VENDOR;
    po.sentToVendorAt = new Date();
    await po.save();

    if (context.userId) {
      await AuditLog.create({
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

  static async revise(id: string, data: { reason: string; lines: any[]; expectedDeliveryDate?: Date }, context: { userId?: string; ip?: string; ua?: string }) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw ApiError.notFound('Purchase Order not found');

    if (!data.reason) {
      throw ApiError.badRequest('Reason for revision is required');
    }

    const user = context.userId ? await User.findById(context.userId) : null;
    const userName = user ? `${user.firstName} ${user.lastName}` : 'System User';

    // Snapshot current state
    po.revisions.push({
      revisionNumber: po.revisionNumber,
      revisedAt: new Date(),
      revisedById: (context.userId as any) || (user?._id as any),
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
      await AuditLog.create({
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
