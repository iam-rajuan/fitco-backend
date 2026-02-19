import mongoose, { Document, Schema } from 'mongoose';

export interface CmsDocument extends Document {
  key: 'terms' | 'privacy' | 'about';
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CmsSchema = new Schema<CmsDocument>(
  {
    key: { type: String, enum: ['terms', 'privacy', 'about'], required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true }
  },
  { timestamps: true }
);

const CmsModel = mongoose.model<CmsDocument>('CMS', CmsSchema);

export default CmsModel;
