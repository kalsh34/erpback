import { PurchaseOrder } from '../../../models/PurchaseOrder';
import { RFQ } from '../../../models/RFQ';
import { Contact } from '../../../models/Contact';
import { Product } from '../../../models/Product';
import { RFQStatus, POStatus } from '../../../types';

export class PurchaseReportService {
  static async getDashboard() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      openRFQs,
      openPOs,
      pendingApprovals,
      outstandingDeliveries,
      monthlyPurchasesResult,
      recentPOs,
      recentRFQs,
      topSuppliers,
    ] = await Promise.all([
      RFQ.countDocuments({
        status: { $in: [RFQStatus.DRAFT, RFQStatus.SUBMITTED, RFQStatus.SENT_TO_VENDOR, RFQStatus.QUOTATION_RECEIVED, RFQStatus.UNDER_EVALUATION] },
      }),
      PurchaseOrder.countDocuments({
        status: { $in: [POStatus.SUBMITTED, POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED] },
      }),
      PurchaseOrder.countDocuments({ status: POStatus.SUBMITTED }),
      PurchaseOrder.countDocuments({
        status: { $in: [POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED] },
      }),
      PurchaseOrder.aggregate([
        {
          $match: {
            poDate: { $gte: startOfMonth },
            status: { $in: [POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED, POStatus.FULLY_RECEIVED, POStatus.CLOSED] },
          },
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      PurchaseOrder.find()
        .populate('supplierId', 'name code')
        .populate('buyerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5),
      RFQ.find()
        .populate('supplierId', 'name code')
        .sort({ createdAt: -1 })
        .limit(5),
      Contact.find({ isSupplier: true })
        .sort({ totalPurchaseSpend: -1 })
        .limit(5)
        .select('name code totalPurchaseSpend totalOrdersCount supplierRating'),
    ]);

    const monthlyPurchases = monthlyPurchasesResult[0]?.total || 0;

    return {
      kpis: {
        openRFQs,
        openPOs,
        pendingApprovals,
        outstandingDeliveries,
        monthlyPurchases,
      },
      recentPOs,
      recentRFQs,
      topSuppliers,
    };
  }

  static async getPOSummaryReport(filters: any) {
    const query: any = {};

    if (filters.startDate || filters.endDate) {
      query.poDate = {};
      if (filters.startDate) query.poDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.poDate.$lte = new Date(filters.endDate);
    }
    if (filters.supplierId) query.supplierId = filters.supplierId;
    if (filters.buyerId) query.buyerId = filters.buyerId;
    if (filters.department) query.department = filters.department;
    if (filters.status) query.status = filters.status;
    if (filters.warehouse) query.warehouse = filters.warehouse;
    if (filters.productId) query['lines.productId'] = filters.productId;

    const data = await PurchaseOrder.find(query)
      .populate('supplierId', 'name code email phone')
      .populate('buyerId', 'firstName lastName')
      .populate('lines.productId', 'name sku uom')
      .sort({ poDate: -1 });

    return data;
  }

  static async getSupplierSpendReport() {
    const suppliers = await Contact.find({ isSupplier: true })
      .select('name code supplierCategory deliveryTerms paymentTerms supplierRating totalPurchaseSpend totalOrdersCount')
      .sort({ totalPurchaseSpend: -1 });

    const report = await Promise.all(
      suppliers.map(async (s) => {
        const [activeOrders, completedOrders] = await Promise.all([
          PurchaseOrder.countDocuments({
            supplierId: s._id,
            status: { $in: [POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED] },
          }),
          PurchaseOrder.countDocuments({
            supplierId: s._id,
            status: { $in: [POStatus.FULLY_RECEIVED, POStatus.CLOSED] },
          }),
        ]);

        return {
          _id: s._id,
          name: s.name,
          code: s.code,
          supplierCategory: s.supplierCategory,
          deliveryTerms: s.deliveryTerms,
          paymentTerms: s.paymentTerms,
          rating: s.supplierRating,
          totalSpend: s.totalPurchaseSpend || 0,
          totalOrders: s.totalOrdersCount || 0,
          averageOrderValue: s.totalOrdersCount ? Math.round((s.totalPurchaseSpend / s.totalOrdersCount) * 100) / 100 : 0,
          activeOrders,
          completedOrders,
        };
      })
    );

    return report;
  }

  static async getProductPriceHistory(productId?: string) {
    const match: any = {
      status: { $in: [POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED, POStatus.FULLY_RECEIVED, POStatus.CLOSED] },
    };

    if (productId) {
      match['lines.productId'] = productId;
    }

    const data = await PurchaseOrder.aggregate([
      { $match: match },
      { $unwind: '$lines' },
      ...(productId ? [{ $match: { 'lines.productId': productId } }] : []),
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
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
          productName: '$product.name',
          productSku: '$product.sku',
          supplierName: '$supplier.name',
          supplierCode: '$supplier.code',
          quantity: '$lines.quantity',
          uom: '$lines.uom',
          unitPrice: '$lines.unitPrice',
          currency: '$currency',
        },
      },
      { $sort: { poDate: -1 } },
      { $limit: 100 },
    ]);

    return data;
  }

  static async getOutstandingOrdersReport() {
    const orders = await PurchaseOrder.find({
      status: { $in: [POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED] },
    })
      .populate('supplierId', 'name code email phone')
      .populate('buyerId', 'firstName lastName')
      .populate('lines.productId', 'name sku uom')
      .sort({ expectedDeliveryDate: 1 });

    const formatted = orders.map((po) => {
      let totalOrderedQty = 0;
      let totalReceivedQty = 0;

      po.lines.forEach((l) => {
        totalOrderedQty += l.quantity;
        totalReceivedQty += l.receivedQuantity || 0;
      });

      const remainingQty = totalOrderedQty - totalReceivedQty;
      const outstandingAmount = po.lines.reduce((sum, l) => {
        const rem = Math.max(0, l.quantity - (l.receivedQuantity || 0));
        return sum + rem * l.unitPrice;
      }, 0);

      return {
        _id: po._id,
        poNumber: po.poNumber,
        poDate: po.poDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        supplierName: (po.supplierId as any)?.name,
        buyerName: `${(po.buyerId as any)?.firstName || ''} ${(po.buyerId as any)?.lastName || ''}`.trim(),
        status: po.status,
        totalOrderedQty,
        totalReceivedQty,
        remainingQty,
        grandTotal: po.grandTotal,
        outstandingAmount: Math.round(outstandingAmount * 100) / 100,
        isOverdue: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) < new Date() : false,
      };
    });

    return formatted;
  }

  static async getSpendAnalysis() {
    const categorySpend = await PurchaseOrder.aggregate([
      {
        $match: {
          status: { $in: [POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED, POStatus.FULLY_RECEIVED, POStatus.CLOSED] },
        },
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSpend: { $sum: '$lines.subtotal' },
          itemCount: { $sum: '$lines.quantity' },
        },
      },
      { $sort: { totalSpend: -1 } },
    ]);

    const departmentSpend = await PurchaseOrder.aggregate([
      {
        $match: {
          status: { $in: [POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED, POStatus.FULLY_RECEIVED, POStatus.CLOSED] },
        },
      },
      {
        $group: {
          _id: '$department',
          totalSpend: { $sum: '$grandTotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpend: -1 } },
    ]);

    return {
      categorySpend,
      departmentSpend,
    };
  }
}
