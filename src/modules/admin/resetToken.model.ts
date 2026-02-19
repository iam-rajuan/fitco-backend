import mongoose, { Document, Schema } from 'mongoose';

export interface AdminResetTokenDocument extends Document {
  admin: mongoose.Types.ObjectId;
  token: string;
  type: 'password_reset';
  expiresAt: Date;
  used: boolean;
  verified: boolean;
}

const AdminResetTokenSchema = new Schema<AdminResetTokenDocument>(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    token: { type: String, required: true },
    type: { type: String, enum: ['password_reset'], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    verified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const AdminResetTokenModel = mongoose.model<AdminResetTokenDocument>('AdminResetToken', AdminResetTokenSchema);

export default AdminResetTokenModel;
