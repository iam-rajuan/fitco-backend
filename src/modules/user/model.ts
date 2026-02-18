import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../../utils/constants';

export interface RefreshToken {
  token: string;
  expiresAt: Date;
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  height?: number;
  weight?: number;
  goals?: string;
  subscriptionStatus: 'free' | 'premium';
  isBlocked: boolean;
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

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: [ROLES.ADMIN, ROLES.USER], default: ROLES.USER },
    height: Number,
    weight: Number,
    goals: String,
    subscriptionStatus: { type: String, enum: ['free', 'premium'], default: 'free' },
    isBlocked: { type: Boolean, default: false },
    refreshTokens: [RefreshTokenSchema]
  },
  { timestamps: true }
);

UserSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const UserModel = mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
