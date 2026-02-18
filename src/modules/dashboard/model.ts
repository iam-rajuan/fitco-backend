import mongoose, { Document, Schema } from 'mongoose';

export interface DashboardSnapshotDocument extends Document {
  label: string;
  metrics: Record<string, unknown>;
}

const DashboardSnapshotSchema = new Schema<DashboardSnapshotDocument>(
  {
    label: { type: String, required: true },
    metrics: { type: Object, required: true }
  },
  { timestamps: true }
);

const DashboardSnapshotModel = mongoose.model<DashboardSnapshotDocument>('DashboardSnapshot', DashboardSnapshotSchema);

export default DashboardSnapshotModel;