import mongoose, { Document } from 'mongoose';
import { ProductType } from '../types';
export interface IProduct extends Document {
    sku: string;
    name: string;
    type: ProductType;
    category: string;
    uom: string;
    salesPrice: number;
    purchasePrice: number;
    taxRate: number;
    barcode?: string;
    description?: string;
    defaultSupplierId?: mongoose.Types.ObjectId;
    supplierProductCode?: string;
    supplierPrice?: number;
    supplierCurrency?: string;
    minOrderQuantity: number;
    leadTimeDays: number;
    purchaseUom?: string;
    supplierDescription?: string;
    currentStock: number;
    incomingStock: number;
    reorderLevel: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Product: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Product.d.ts.map