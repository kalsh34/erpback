import mongoose, { Document } from 'mongoose';
export interface IPosition extends Document {
    name: string;
    departmentId?: mongoose.Types.ObjectId;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Position: mongoose.Model<IPosition, {}, {}, {}, mongoose.Document<unknown, {}, IPosition, {}, {}> & IPosition & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Position.d.ts.map