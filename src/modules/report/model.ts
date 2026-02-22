import mongoose, { Document, Schema } from 'mongoose';

export interface ReportDocument extends Document {
  user?: mongoose.Types.ObjectId;
  issueType?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactInfo?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

const ReportSchema = new Schema<ReportDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    issueType: { type: String, default: 'other' },
    description: { type: String, default: '' },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactInfo: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' }
  },
  { timestamps: true }
);

const ReportModel = mongoose.model<ReportDocument>('Report', ReportSchema);

export default ReportModel;
