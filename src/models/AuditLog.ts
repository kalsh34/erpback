import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: mongoose.Types.ObjectId;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    reason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
