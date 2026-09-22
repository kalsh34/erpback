import mongoose, { Schema, Document } from 'mongoose';

export interface IFileAttachment extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: mongoose.Types.ObjectId;
  entityType: string;
  entityId?: mongoose.Types.ObjectId | null;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const fileAttachmentSchema = new Schema<IFileAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entityType: { type: String, required: true, trim: true, lowercase: true },
    entityId: { type: Schema.Types.ObjectId, required: false, default: null },
    description: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

fileAttachmentSchema.index({ entityType: 1, entityId: 1 });
fileAttachmentSchema.index({ uploadedBy: 1 });

export const FileAttachment = mongoose.model<IFileAttachment>('FileAttachment', fileAttachmentSchema);
