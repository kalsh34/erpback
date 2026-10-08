import { RFQ, IRFQ, IRFQLine } from '../../../models/RFQ';
import { PurchaseOrder } from '../../../models/PurchaseOrder';
import { Product } from '../../../models/Product';
import { AuditLog } from '../../../models/AuditLog';
import { ApiError } from '../../../common/ApiError';
import { RFQStatus, POStatus } from '../../../types';
import { NumberingService } from '../common/numbering.service';

interface RFQQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: string;
  buyerId?: string;
  search?: string;
  sort?: string;
  dir?: string;
}

export class RFQService {
  private static calculateLineSubtotal(line: Partial<IRFQLine>): number {
    const qty = line.quantity || 0;
    const price = line.vendorPrice && line.vendorPrice > 0 ? line.vendorPrice : (line.estimatedPrice || 0);
    const discount = line.discount || 0;
    const tax = line.tax || 0;
    const base = qty * price;
    const afterDiscount = base * (1 - discount / 100);
    const withTax = afterDiscount * (1 + tax / 100);
    return Math.round(withTax * 100) / 100;
  }

  static async getAll(options: RFQQueryOptions) {
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

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.$or = [
        { rfqNumber: searchRegex },
        { reference: searchRegex },
        { requestingDepartment: searchRegex },
      ];
    }

    const sortField = options.sort || 'createdAt';
    const sortDir = options.dir === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      RFQ.find(query)
        .populate('supplierId', 'name code email phone')
        .populate('buyerId', 'firstName lastName email')
        .populate('lines.productId', 'name sku uom')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      RFQ.countDocuments(query),
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
    const rfq = await RFQ.findById(id)
      .populate('supplierId', 'name code email phone address city paymentTerms currency deliveryTerms')
      .populate('buyerId', 'firstName lastName email')
      .populate('approvedById', 'firstName lastName email')
      .populate('lines.productId', 'name sku uom currentStock purchasePrice')
      .populate('purchaseOrderId', 'poNumber status grandTotal createdAt');

    if (!rfq) {
      throw ApiError.notFound('RFQ not found');
    }

    return rfq;
  }

  static async create(data: any, context: { userId?: string; ip?: string; ua?: string }) {
    if (!data.supplierId) {
      throw ApiError.badRequest('Supplier is required');
    }
    if (!data.lines || !Array.isArray(data.lines) || data.lines.length === 0) {
      throw ApiError.badRequest('At least one item line is required');
    }

    const rfqNumber = await NumberingService.getNextNumber('RFQ');

    let totalEstimated = 0;
    let totalQuoted = 0;

    const lines: IRFQLine[] = data.lines.map((l: any) => {
      const subtotal = this.calculateLineSubtotal(l);
      const estSubtotal = (l.quantity || 0) * (l.estimatedPrice || 0);
      totalEstimated += estSubtotal;
      totalQuoted += subtotal;

      return {
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        uom: l.uom || 'PCS',
        requestedDate: l.requestedDate,
        estimatedPrice: l.estimatedPrice || 0,
        vendorPrice: l.vendorPrice || 0,
        discount: l.discount || 0,
        tax: l.tax !== undefined ? l.tax : 15,
        subtotal,
      };
    });

    const rfq = await RFQ.create({
      ...data,
      rfqNumber,
      buyerId: data.buyerId || context.userId,
      lines,
      totalEstimatedAmount: Math.round(totalEstimated * 100) / 100,
      totalQuotedAmount: Math.round(totalQuoted * 100) / 100,
      status: RFQStatus.DRAFT,
    });

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_CREATE',
        entity: 'RFQ',
        entityId: rfq._id,
        newValues: rfq.toObject(),
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async update(id: string, data: any, context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id);
    if (!rfq) {
      throw ApiError.notFound('RFQ not found');
    }

    if (rfq.status === RFQStatus.PO_CREATED) {
      throw ApiError.badRequest('Cannot edit an RFQ that has already been converted to a Purchase Order');
    }

    const oldValues = rfq.toObject();

    if (data.lines && Array.isArray(data.lines)) {
      let totalEstimated = 0;
      let totalQuoted = 0;

      rfq.lines = data.lines.map((l: any) => {
        const subtotal = this.calculateLineSubtotal(l);
        const estSubtotal = (l.quantity || 0) * (l.estimatedPrice || 0);
        totalEstimated += estSubtotal;
        totalQuoted += subtotal;

        return {
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          uom: l.uom || 'PCS',
          requestedDate: l.requestedDate,
          estimatedPrice: l.estimatedPrice || 0,
          vendorPrice: l.vendorPrice || 0,
          discount: l.discount || 0,
          tax: l.tax !== undefined ? l.tax : 15,
          subtotal,
        } as IRFQLine;
      });

      rfq.totalEstimatedAmount = Math.round(totalEstimated * 100) / 100;
      rfq.totalQuotedAmount = Math.round(totalQuoted * 100) / 100;
    }

    if (data.expectedDeliveryDate !== undefined) rfq.expectedDeliveryDate = data.expectedDeliveryDate;
    if (data.paymentTerms !== undefined) rfq.paymentTerms = data.paymentTerms;
    if (data.deliveryTerms !== undefined) rfq.deliveryTerms = data.deliveryTerms;
    if (data.reference !== undefined) rfq.reference = data.reference;
    if (data.notes !== undefined) rfq.notes = data.notes;
    if (data.requestingDepartment !== undefined) rfq.requestingDepartment = data.requestingDepartment;
    if (data.supplierId !== undefined) rfq.supplierId = data.supplierId;

    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_UPDATE',
        entity: 'RFQ',
        entityId: rfq._id,
        oldValues,
        newValues: rfq.toObject(),
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async submit(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');
    if (rfq.status !== RFQStatus.DRAFT) throw ApiError.badRequest(`Cannot submit RFQ in status ${rfq.status}`);

    rfq.status = RFQStatus.SUBMITTED;
    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_SUBMIT',
        entity: 'RFQ',
        entityId: rfq._id,
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async send(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    rfq.status = RFQStatus.SENT_TO_VENDOR;
    rfq.sentAt = new Date();
    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_SENT_TO_VENDOR',
        entity: 'RFQ',
        entityId: rfq._id,
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async recordQuotation(id: string, quotes: { lineId: string; vendorPrice: number; discount?: number; tax?: number }[], context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    let totalQuoted = 0;

    rfq.lines.forEach((line: any) => {
      const match = quotes.find((q) => q.lineId === line._id.toString());
      if (match) {
        line.vendorPrice = match.vendorPrice;
        if (match.discount !== undefined) line.discount = match.discount;
        if (match.tax !== undefined) line.tax = match.tax;
        line.subtotal = this.calculateLineSubtotal(line);
      }
      totalQuoted += line.subtotal || 0;
    });

    rfq.totalQuotedAmount = Math.round(totalQuoted * 100) / 100;
    rfq.status = RFQStatus.QUOTATION_RECEIVED;
    rfq.quotationReceivedAt = new Date();
    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_QUOTATION_RECORDED',
        entity: 'RFQ',
        entityId: rfq._id,
        newValues: { totalQuotedAmount: rfq.totalQuotedAmount, lines: rfq.lines },
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async approve(id: string, context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    rfq.status = RFQStatus.APPROVED;
    rfq.approvedAt = new Date();
    if (context.userId) {
      rfq.approvedById = context.userId as any;
    }
    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_APPROVE',
        entity: 'RFQ',
        entityId: rfq._id,
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async reject(id: string, reason: string, context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    rfq.status = RFQStatus.REJECTED;
    rfq.rejectionReason = reason;
    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_REJECT',
        entity: 'RFQ',
        entityId: rfq._id,
        reason,
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return rfq;
  }

  static async convertToPO(id: string, extraData: any, context: { userId?: string; ip?: string; ua?: string }) {
    const rfq = await RFQ.findById(id).populate('lines.productId');
    if (!rfq) throw ApiError.notFound('RFQ not found');

    if (rfq.status !== RFQStatus.APPROVED) {
      throw ApiError.badRequest('Only APPROVED RFQs can be converted to a Purchase Order');
    }

    const poNumber = await NumberingService.getNextNumber('PO');

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const poLines = rfq.lines.map((l: any) => {
      const unitPrice = l.vendorPrice > 0 ? l.vendorPrice : l.estimatedPrice;
      const baseAmount = l.quantity * unitPrice;
      const discountAmount = baseAmount * ((l.discount || 0) / 100);
      const taxAmount = (baseAmount - discountAmount) * ((l.tax || 0) / 100);

      subtotal += baseAmount;
      totalDiscount += discountAmount;
      totalTax += taxAmount;

      return {
        productId: l.productId?._id || l.productId,
        supplierProductCode: l.productId?.supplierProductCode || '',
        description: l.description || l.productId?.name,
        quantity: l.quantity,
        uom: l.uom || 'PCS',
        unitPrice,
        discount: l.discount || 0,
        tax: l.tax || 0,
        subtotal: l.subtotal,
        expectedDeliveryDate: l.requestedDate || rfq.expectedDeliveryDate,
        warehouse: extraData?.warehouse || 'Main Warehouse',
        receivedQuantity: 0,
      };
    });

    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    const po = await PurchaseOrder.create({
      poNumber,
      poDate: new Date(),
      rfqId: rfq._id,
      supplierId: rfq.supplierId,
      buyerId: rfq.buyerId || context.userId,
      department: rfq.requestingDepartment,
      currency: rfq.currency,
      paymentTerms: rfq.paymentTerms,
      deliveryTerms: rfq.deliveryTerms,
      expectedDeliveryDate: rfq.expectedDeliveryDate,
      warehouse: extraData?.warehouse || 'Main Warehouse',
      reference: rfq.reference || rfq.rfqNumber,
      notes: rfq.notes,
      lines: poLines,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal,
      status: POStatus.DRAFT,
      approvalStage: 'DRAFT',
    });

    rfq.status = RFQStatus.PO_CREATED;
    rfq.purchaseOrderId = po._id as any;
    await rfq.save();

    if (context.userId) {
      await AuditLog.create({
        userId: context.userId,
        action: 'RFQ_CONVERT_TO_PO',
        entity: 'RFQ',
        entityId: rfq._id,
        newValues: { poId: po._id, poNumber: po.poNumber },
        ipAddress: context.ip,
        userAgent: context.ua,
      });
    }

    return po;
  }

  static async compareQuotations(productIds?: string[]) {
    const matchQuery: any = {
      status: { $in: [RFQStatus.QUOTATION_RECEIVED, RFQStatus.UNDER_EVALUATION, RFQStatus.APPROVED, RFQStatus.PO_CREATED] },
    };

    const rfqs = await RFQ.find(matchQuery)
      .populate('supplierId', 'name code supplierRating deliveryTerms paymentTerms')
      .populate('lines.productId', 'name sku uom')
      .sort({ createdAt: -1 })
      .limit(30);

    return rfqs;
  }
}
