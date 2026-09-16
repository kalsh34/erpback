import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteNote extends Document {
  siteId: mongoose.Types.ObjectId;
  date: string;
  noteText: string;
  recordedById: mongoose.Types.ObjectId;
  createdAt: Date;
}

const siteNoteSchema = new Schema<ISiteNote>(
  {
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: String, required: true },
    noteText: { type: String, required: true, trim: true },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

siteNoteSchema.index({ siteId: 1, date: 1 });
siteNoteSchema.index({ siteId: 1, createdAt: -1 });

export const SiteNote = mongoose.model<ISiteNote>('SiteNote', siteNoteSchema);
