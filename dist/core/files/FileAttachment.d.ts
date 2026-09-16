import mongoose, { Document } from 'mongoose';
export interface IFileAttachment extends Document {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    uploadedBy: mongoose.Types.ObjectId;
    entityType: string;
    entityId: mongoose.Types.ObjectId;
    description?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const FileAttachment: mongoose.Model<IFileAttachment, {}, {}, {}, mongoose.Document<unknown, {}, IFileAttachment, {}, {}> & IFileAttachment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=FileAttachment.d.ts.map