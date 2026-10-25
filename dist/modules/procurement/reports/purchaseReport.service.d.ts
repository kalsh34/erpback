import { POStatus } from '../../../types';
export declare class PurchaseReportService {
    static getDashboard(): Promise<{
        kpis: {
            openRFQs: number;
            openPOs: number;
            pendingApprovals: number;
            outstandingDeliveries: number;
            monthlyPurchases: any;
        };
        recentPOs: (import("mongoose").Document<unknown, {}, import("../../../models/PurchaseOrder").IPurchaseOrder, {}, {}> & import("../../../models/PurchaseOrder").IPurchaseOrder & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        recentRFQs: (import("mongoose").Document<unknown, {}, import("../../../models/RFQ").IRFQ, {}, {}> & import("../../../models/RFQ").IRFQ & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        topSuppliers: (import("mongoose").Document<unknown, {}, import("../../../models/Contact").IContact, {}, {}> & import("../../../models/Contact").IContact & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static getPOSummaryReport(filters: any): Promise<(import("mongoose").Document<unknown, {}, import("../../../models/PurchaseOrder").IPurchaseOrder, {}, {}> & import("../../../models/PurchaseOrder").IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getSupplierSpendReport(): Promise<{
        _id: import("mongoose").Types.ObjectId;
        name: string;
        code: string;
        supplierCategory: string | undefined;
        deliveryTerms: string | undefined;
        paymentTerms: string;
        rating: number;
        totalSpend: number;
        totalOrders: number;
        averageOrderValue: number;
        activeOrders: number;
        completedOrders: number;
    }[]>;
    static getProductPriceHistory(productId?: string): Promise<any[]>;
    static getOutstandingOrdersReport(): Promise<{
        _id: import("mongoose").Types.ObjectId;
        poNumber: string;
        poDate: Date;
        expectedDeliveryDate: Date | undefined;
        supplierName: any;
        buyerName: string;
        status: POStatus;
        totalOrderedQty: number;
        totalReceivedQty: number;
        remainingQty: number;
        grandTotal: number;
        outstandingAmount: number;
        isOverdue: boolean;
    }[]>;
    static getSpendAnalysis(): Promise<{
        categorySpend: any[];
        departmentSpend: any[];
    }>;
}
//# sourceMappingURL=purchaseReport.service.d.ts.map