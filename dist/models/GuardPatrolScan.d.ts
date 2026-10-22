import mongoose, { Document } from 'mongoose';
/**
 * A patrol scan: the guard scans a site QR code while on an OPEN shift at
 * that site. Proves the guard actually walked the site during the shift.
 */
export interface IGuardPatrolScan extends Document {
    shiftId: mongoose.Types.ObjectId;
    guardUserId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    /** Local calendar date (YYYY-MM-DD) of the scan. */
    date: string;
    scannedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardPatrolScan: mongoose.Model<IGuardPatrolScan, {}, {}, {}, mongoose.Document<unknown, {}, IGuardPatrolScan, {}, {}> & IGuardPatrolScan & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardPatrolScan.d.ts.map