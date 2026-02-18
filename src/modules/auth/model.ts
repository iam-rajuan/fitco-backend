import mongoose, { Document, Schema } from 'mongoose';

export interface AuthTokenDocument extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  type: 'password_reset';
  expiresAt: Date;
  used: boolean;
}

const AuthTokenSchema = new Schema<AuthTokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    type: { type: String, enum: ['password_reset'], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const AuthTokenModel = mongoose.model<AuthTokenDocument>('AuthToken', AuthTokenSchema);

export default AuthTokenModel;