import mongoose, { Document, Schema } from 'mongoose';

export interface ReportDocument extends Document {
  user?: mongoose.Types.ObjectId;
  issueType: string;
  description: string;
  contactInfo: string;
  status: 'open' | 'in_progress' | 'resolved';
}

const ReportSchema = new Schema<ReportDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    issueType: { type: String, required: true },
    description: { type: String, required: true },
    contactInfo: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' }
  },
  { timestamps: true }
);

const ReportModel = mongoose.model<ReportDocument>('Report', ReportSchema);

export default ReportModel;