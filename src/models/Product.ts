import mongoose, { Schema, Document } from 'mongoose';
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
  // Purchase specifics
  defaultSupplierId?: mongoose.Types.ObjectId;
  supplierProductCode?: string;
  supplierPrice?: number;
  supplierCurrency?: string;
  minOrderQuantity: number;
  leadTimeDays: number;
  purchaseUom?: string;
  supplierDescription?: string;
  // Inventory tracking link
  currentStock: number;
  incomingStock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ProductType), default: ProductType.STOCKABLE },
    category: { type: String, required: true, trim: true, default: 'General' },
    uom: { type: String, required: true, trim: true, default: 'PCS' },
    salesPrice: { type: Number, default: 0, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 15, min: 0 }, // Standard 15% VAT default
    barcode: { type: String, trim: true },
    description: { type: String, trim: true },

    defaultSupplierId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    supplierProductCode: { type: String, trim: true },
    supplierPrice: { type: Number, default: 0, min: 0 },
    supplierCurrency: { type: String, default: 'ETB', uppercase: true },
    minOrderQuantity: { type: Number, default: 1, min: 1 },
    leadTimeDays: { type: Number, default: 3, min: 0 },
    purchaseUom: { type: String, trim: true, default: 'PCS' },
    supplierDescription: { type: String, trim: true },

    currentStock: { type: Number, default: 0 },
    incomingStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ defaultSupplierId: 1 });
productSchema.index({ isActive: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
