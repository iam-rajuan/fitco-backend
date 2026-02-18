import mongoose, { Document, Schema } from 'mongoose';
import { PLAN_TYPES, SUBSCRIPTION_STATUS, PlanType, SubscriptionStatus } from '../../utils/constants';

export interface SubscriptionDocument extends Document {
  user: mongoose.Types.ObjectId;
  planType: PlanType;
  price: number;
  expiryDate: Date;
  status: SubscriptionStatus;
  couponCode?: string;
  startedAt: Date;
}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planType: { type: String, enum: Object.values(PLAN_TYPES), required: true },
    price: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.ACTIVE },
    couponCode: String,
    startedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const SubscriptionModel = mongoose.model<SubscriptionDocument>('Subscription', SubscriptionSchema);

export default SubscriptionModel;