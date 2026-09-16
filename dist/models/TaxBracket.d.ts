import mongoose, { Document } from 'mongoose';
export interface ITaxBracket extends Document {
    label: string;
    brackets: {
        min: number;
        max: number | null;
        rate: number;
        deduction: number;
    }[];
    effectiveFrom: Date;
    effectiveTo?: Date;
    isCurrent: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const TaxBracket: mongoose.Model<ITaxBracket, {}, {}, {}, mongoose.Document<unknown, {}, ITaxBracket, {}, {}> & ITaxBracket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=TaxBracket.d.ts.map