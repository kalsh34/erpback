import mongoose, { Document } from 'mongoose';
/** One progressive step. max = null means "up to infinity". rate is a percentage (e.g. 10 = 10%). */
export interface ITaxBracketLine {
    min: number;
    max: number | null;
    rate: number;
}
/** Which payroll system a table belongs to. Older rows (created before the
 *  split) carry no kind and are treated as GUARD. */
export type TaxTableKind = 'GUARD' | 'STAFF';
/**
 * INCOME TAX TABLE — date-effective set of progressive brackets applied to the
 * monthly taxable earnings. Re-created after the v1 teardown; shared
 * infrastructure for guard and staff payroll (each resolves its own kind).
 */
export interface ITaxBracket extends Document {
    name: string;
    kind?: TaxTableKind;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    brackets: ITaxBracketLine[];
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const TaxBracket: mongoose.Model<ITaxBracket, {}, {}, {}, mongoose.Document<unknown, {}, ITaxBracket, {}, {}> & ITaxBracket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=TaxBracket.d.ts.map