import SubscriptionModel, { SubscriptionDocument } from './model';
import TransactionModel from './transaction.model';
import UserModel from '../user/model';
import * as couponService from '../coupon/service';
import { PLAN_TYPES, SUBSCRIPTION_STATUS, PlanType, SubscriptionStatus } from '../../utils/constants';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

interface ListParams {
  page?: number | string;
  limit?: number | string;
}

interface CreateSubscriptionInput {
  userId: string;
  planType: PlanType;
  price: number;
  couponCode?: string;
}

const calculateExpiry = (planType: PlanType): Date => {
  const now = new Date();
  if (planType === PLAN_TYPES.YEARLY) {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
  return new Date(now.setMonth(now.getMonth() + 1));
};

const expireLapsedSubscriptions = async (): Promise<void> => {
  await SubscriptionModel.updateMany(
    { expiryDate: { $lt: new Date() }, status: SUBSCRIPTION_STATUS.ACTIVE },
    { status: SUBSCRIPTION_STATUS.EXPIRED }
  );
};

export const createSubscription = async ({ userId, planType, price, couponCode }: CreateSubscriptionInput): Promise<SubscriptionDocument> => {
  if (!Object.values(PLAN_TYPES).includes(planType)) {
    const error = new Error('Invalid plan type');
    (error as any).statusCode = 400;
    throw error;
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }
  const amount = Number(price);
  if (Number.isNaN(amount) || amount <= 0) {
    const error = new Error('Invalid price');
    (error as any).statusCode = 400;
    throw error;
  }
  let finalPrice = amount;
  let appliedCoupon: { code: string; discountPercentage: number } | null = null;
  if (couponCode) {
    const coupon = await couponService.getCouponByCode(couponCode);
    if (!coupon) {
      const error = new Error('Invalid coupon');
      (error as any).statusCode = 400;
      throw error;
    }
    appliedCoupon = { code: coupon.code, discountPercentage: coupon.discountPercentage };
    finalPrice = Number((amount * (1 - coupon.discountPercentage / 100)).toFixed(2));
  }

  const expiryDate = calculateExpiry(planType);

  const subscription = await SubscriptionModel.create({
    user: userId,
    planType,
    price: finalPrice,
    expiryDate,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    couponCode: appliedCoupon ? appliedCoupon.code : undefined
  });

  await TransactionModel.create({
    user: userId,
    amount: finalPrice,
    planType,
    couponCode: appliedCoupon ? appliedCoupon.code : undefined,
    reference: `sub_${subscription._id}`,
    status: 'paid'
  });

  await UserModel.findByIdAndUpdate(userId, { subscriptionStatus: 'premium' });

  return subscription;
};

export const listSubscriptions = async ({ page = 1, limit = 20 }: ListParams): Promise<PaginatedResult<SubscriptionDocument>> => {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const skip = (pageNumber - 1) * limitNumber;
  const [data, total] = await Promise.all([
    SubscriptionModel.find().populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
    SubscriptionModel.countDocuments()
  ]);
  return {
    data,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber) || 1
    }
  };
};

export const getSubscriptionById = (id: string): Promise<SubscriptionDocument | null> => {
  return SubscriptionModel.findById(id).populate('user', 'name email');
};

export const getUserActiveSubscription = async (userId: string): Promise<SubscriptionDocument | null> => {
  await expireLapsedSubscriptions();
  return SubscriptionModel.findOne({ user: userId, status: SUBSCRIPTION_STATUS.ACTIVE, expiryDate: { $gt: new Date() } });
};

export const expireSubscription = (id: string): Promise<SubscriptionDocument | null> => {
  return SubscriptionModel.findByIdAndUpdate(id, { status: SUBSCRIPTION_STATUS.EXPIRED }, { new: true });
};