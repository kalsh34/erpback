import mongoose, { Schema, Document } from 'mongoose';

/**
 * A patrol scan: the guard scans a site QR code while on an OPEN shift at
 * that site. Proves the guard actually walked the site during the shift.
 */
export interface IGuardPatrolScan extends Document {
  shiftId: mongoose.Types.ObjectId; // GuardShift the scan belongs to
  guardUserId: mongoose.Types.ObjectId; // User (login account)
  employeeId: mongoose.Types.ObjectId; // Employee (guard staff record)
  siteId: mongoose.Types.ObjectId; // Site whose QR was scanned
  /** Local calendar date (YYYY-MM-DD) of the scan. */
  date: string;
  scannedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guardPatrolScanSchema = new Schema<IGuardPatrolScan>(
  {
    shiftId: { type: Schema.Types.ObjectId, ref: 'GuardShift', required: true },
    guardUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    scannedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

guardPatrolScanSchema.index({ shiftId: 1, scannedAt: 1 });
guardPatrolScanSchema.index({ siteId: 1, date: 1 });
guardPatrolScanSchema.index({ employeeId: 1, date: 1 });

export const GuardPatrolScan = mongoose.model<IGuardPatrolScan>('GuardPatrolScan', guardPatrolScanSchema);
