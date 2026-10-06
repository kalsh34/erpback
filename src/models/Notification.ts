import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId; // recipient
  title: string;
  message: string;
  type: NotificationType;
  /** Optional in-app deep link (e.g. /attendance). */
  link?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ALERT'], default: 'INFO' },
    link: { type: String, trim: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
