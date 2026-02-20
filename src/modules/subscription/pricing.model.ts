import mongoose, { Document, Schema } from 'mongoose';

export interface SubscriptionPricingDocument extends Document {
  key: 'default';
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPricingSchema = new Schema<SubscriptionPricingDocument>(
  {
    key: { type: String, enum: ['default'], default: 'default', unique: true },
    monthlyPriceCents: { type: Number, required: true, min: 1 },
    yearlyPriceCents: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, lowercase: true, trim: true, default: 'usd' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

const SubscriptionPricingModel = mongoose.model<SubscriptionPricingDocument>(
  'SubscriptionPricing',
  SubscriptionPricingSchema
);

export default SubscriptionPricingModel;
