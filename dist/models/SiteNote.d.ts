import mongoose, { Document } from 'mongoose';
export interface ISiteNote extends Document {
    siteId: mongoose.Types.ObjectId;
    date: string;
    noteText: string;
    recordedById: mongoose.Types.ObjectId;
    createdAt: Date;
}
export declare const SiteNote: mongoose.Model<ISiteNote, {}, {}, {}, mongoose.Document<unknown, {}, ISiteNote, {}, {}> & ISiteNote & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SiteNote.d.ts.map