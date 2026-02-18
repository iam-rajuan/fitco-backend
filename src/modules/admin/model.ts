import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../../utils/constants';

interface RefreshToken {
  token: string;
  expiresAt: Date;
}

export interface AdminDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  refreshTokens: RefreshToken[];
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<RefreshToken>(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { _id: false }
);

const AdminSchema = new Schema<AdminDocument>(
  {
    name: { type: String, trim: true, default: 'Administrator' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: [ROLES.ADMIN], default: ROLES.ADMIN },
    refreshTokens: [RefreshTokenSchema]
  },
  { timestamps: true }
);

AdminSchema.pre<AdminDocument>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

AdminSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const AdminModel = mongoose.model<AdminDocument>('Admin', AdminSchema);

export default AdminModel;
