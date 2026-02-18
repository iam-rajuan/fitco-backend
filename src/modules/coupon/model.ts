import mongoose, { Document, Schema } from 'mongoose';

export interface CouponDocument extends Document {
  code: string;
  discountPercentage: number;
  expiryDate: Date;
  isActive: boolean;
}

const CouponSchema = new Schema<CouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const CouponModel = mongoose.model<CouponDocument>('Coupon', CouponSchema);

export default CouponModel;