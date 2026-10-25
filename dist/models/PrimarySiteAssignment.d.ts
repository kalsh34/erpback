import mongoose, { Document } from 'mongoose';
export interface IPrimarySiteAssignment extends Document {
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    role: 'GUARD' | 'SUPERVISOR';
    /** Explicit primary-site flag — never inferred from array order. Exactly one
     *  current assignment per guard carries true (kept in sync with homeSiteId). */
    isPrimary: boolean;
    standardMonthlyHours: number;
    hourlyRate: number;
    transportAllowance: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    isCurrent: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PrimarySiteAssignment: mongoose.Model<IPrimarySiteAssignment, {}, {}, {}, mongoose.Document<unknown, {}, IPrimarySiteAssignment, {}, {}> & IPrimarySiteAssignment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PrimarySiteAssignment.d.ts.map