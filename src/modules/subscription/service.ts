import Stripe from 'stripe';
import stripe from '../../config/stripe';
import config from '../../config';
import SubscriptionModel, { SubscriptionDocument } from './model';
import SubscriptionPricingModel from './pricing.model';
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

interface CreateCheckoutSessionInput {
  userId: string;
  planType: PlanType;
  couponCode?: string;
}

interface QuoteInput {
  planType: PlanType;
  couponCode?: string;
}

interface PricingContext {
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
}

interface PlanPrice {
  planType: PlanType;
  interval: 'month' | 'year';
  label: string;
  price: number;
  priceCents: number;
  currency: string;
}

interface QuoteResult {
  planType: PlanType;
  basePrice: number;
  basePriceCents: number;
  finalPrice: number;
  finalPriceCents: number;
  discountAmount: number;
  discountAmountCents: number;
  discountPercentage: number;
  couponCode?: string;
  currency: string;
}

interface PricingSettingsResponse {
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  updatedAt: Date;
}

const centsToAmount = (value: number): number => Number((value / 100).toFixed(2));

const parsePlanInterval = (planType: PlanType): 'month' | 'year' => (planType === PLAN_TYPES.YEARLY ? 'year' : 'month');

const getPlanPriceCents = (planType: PlanType, pricing: PricingContext): number => {
  if (planType === PLAN_TYPES.YEARLY) {
    return pricing.yearlyPriceCents;
  }
  return pricing.monthlyPriceCents;
};

const buildPlanPrice = (planType: PlanType, pricing: PricingContext): PlanPrice => {
  const priceCents = getPlanPriceCents(planType, pricing);
  return {
    planType,
    interval: parsePlanInterval(planType),
    label: planType === PLAN_TYPES.YEARLY ? 'Yearly Plan' : 'Monthly Plan',
    price: centsToAmount(priceCents),
    priceCents,
    currency: pricing.currency
  };
};

const calculateExpiryByPlan = (planType: PlanType): Date => {
  const now = new Date();
  if (planType === PLAN_TYPES.YEARLY) {
    now.setFullYear(now.getFullYear() + 1);
    return now;
  }
  now.setMonth(now.getMonth() + 1);
  return now;
};

const ensureValidPlanType = (planType: PlanType): void => {
  if (!Object.values(PLAN_TYPES).includes(planType)) {
    const error = new Error('Invalid plan type');
    (error as any).statusCode = 400;
    throw error;
  }
};

const getOrCreatePricingSettings = async () => {
  let settings = await SubscriptionPricingModel.findOne({ key: 'default' });
  if (!settings) {
    settings = await SubscriptionPricingModel.create({
      key: 'default',
      monthlyPriceCents: config.stripe.monthlyPriceCents,
      yearlyPriceCents: config.stripe.yearlyPriceCents,
      currency: config.stripe.currency
    });
  }
  return settings;
};

const getPricingContext = async (): Promise<PricingContext> => {
  const settings = await getOrCreatePricingSettings();
  return {
    monthlyPriceCents: settings.monthlyPriceCents,
    yearlyPriceCents: settings.yearlyPriceCents,
    currency: settings.currency
  };
};

const expireLapsedSubscriptions = async (): Promise<void> => {
  await SubscriptionModel.updateMany(
    { expiryDate: { $lt: new Date() }, status: SUBSCRIPTION_STATUS.ACTIVE },
    { status: SUBSCRIPTION_STATUS.EXPIRED }
  );
};

const ensureStripeConfigured = (mode: 'checkout' | 'webhook'): void => {
  if (!config.stripe.secretKey) {
    const error = new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY');
    (error as any).statusCode = 400;
    throw error;
  }
  if (mode === 'webhook' && !config.stripe.webhookSecret) {
    const error = new Error('Stripe webhook is not configured. Missing STRIPE_WEBHOOK_SECRET');
    (error as any).statusCode = 400;
    throw error;
  }
};

const getQuoteInternal = async ({ planType, couponCode }: QuoteInput): Promise<QuoteResult> => {
  ensureValidPlanType(planType);
  const pricing = await getPricingContext();

  const basePriceCents = getPlanPriceCents(planType, pricing);
  let finalPriceCents = basePriceCents;
  let discountPercentage = 0;
  let discountAmountCents = 0;
  let appliedCouponCode: string | undefined;

  if (couponCode) {
    const coupon = await couponService.getCouponByCode(couponCode);
    if (!coupon) {
      const error = new Error('Invalid coupon');
      (error as any).statusCode = 400;
      throw error;
    }
    discountPercentage = coupon.discountPercentage;
    discountAmountCents = Math.round(basePriceCents * (discountPercentage / 100));
    finalPriceCents = Math.max(basePriceCents - discountAmountCents, 1);
    appliedCouponCode = coupon.code;
  }

  return {
    planType,
    basePrice: centsToAmount(basePriceCents),
    basePriceCents,
    finalPrice: centsToAmount(finalPriceCents),
    finalPriceCents,
    discountAmount: centsToAmount(discountAmountCents),
    discountAmountCents,
    discountPercentage,
    couponCode: appliedCouponCode,
    currency: pricing.currency
  };
};

const getOrCreateStripeCustomer = async (userId: string): Promise<{ user: any; stripeCustomerId: string }> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  if (user.stripeCustomerId) {
    return { user, stripeCustomerId: user.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user._id.toString() }
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return { user, stripeCustomerId: customer.id };
};

const resolveUserForWebhook = async (userId?: string, stripeCustomerId?: string): Promise<any | null> => {
  if (userId) {
    const byId = await UserModel.findById(userId);
    if (byId) return byId;
  }
  if (stripeCustomerId) {
    return UserModel.findOne({ stripeCustomerId });
  }
  return null;
};

const getPlanTypeFromStripeInterval = (interval?: string | null): PlanType => {
  if (interval === 'year') {
    return PLAN_TYPES.YEARLY;
  }
  return PLAN_TYPES.MONTHLY;
};

const toSubscriptionStatus = (stripeStatus: Stripe.Subscription.Status): SubscriptionStatus => {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return SUBSCRIPTION_STATUS.ACTIVE;
  }
  return SUBSCRIPTION_STATUS.EXPIRED;
};

const syncUserSubscriptionStatus = async (userId: string): Promise<void> => {
  const active = await SubscriptionModel.exists({
    user: userId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    expiryDate: { $gt: new Date() }
  });
  await UserModel.findByIdAndUpdate(userId, { subscriptionStatus: active ? 'premium' : 'free' });
};

const upsertLocalSubscription = async (params: {
  userId: string;
  planType: PlanType;
  price: number;
  expiryDate: Date;
  couponCode?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  status?: SubscriptionStatus;
}): Promise<SubscriptionDocument> => {
  const payload = {
    user: params.userId,
    planType: params.planType,
    price: params.price,
    expiryDate: params.expiryDate,
    couponCode: params.couponCode,
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    stripeCheckoutSessionId: params.stripeCheckoutSessionId,
    status: params.status || SUBSCRIPTION_STATUS.ACTIVE
  };

  if (params.stripeSubscriptionId) {
    const updated = await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: params.stripeSubscriptionId },
      payload,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    return updated;
  }

  return SubscriptionModel.create(payload);
};

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session): Promise<void> => {
  if (session.mode !== 'subscription') {
    return;
  }
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined;
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
  if (!stripeSubscriptionId || !stripeCustomerId) {
    return;
  }

  const user = await resolveUserForWebhook(session.metadata?.userId, stripeCustomerId);
  if (!user) {
    const error = new Error('Unable to resolve user for Stripe checkout session');
    (error as any).statusCode = 400;
    throw error;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const interval = (stripeSubscription as any).items?.data?.[0]?.price?.recurring?.interval as string | undefined;
  const planType = (session.metadata?.planType as PlanType) || getPlanTypeFromStripeInterval(interval);
  const finalPriceCents = Number(session.metadata?.finalPriceCents || session.amount_total || 0);
  const finalPrice = centsToAmount(finalPriceCents);
  const couponCode = session.metadata?.couponCode || undefined;
  const currentPeriodEnd = (stripeSubscription as any).current_period_end as number | undefined;
  const expiryDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000)
    : calculateExpiryByPlan(planType);

  await upsertLocalSubscription({
    userId: user._id.toString(),
    planType,
    price: finalPrice,
    expiryDate,
    couponCode,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeCheckoutSessionId: session.id,
    status: toSubscriptionStatus((stripeSubscription as any).status as Stripe.Subscription.Status)
  });

  const reference = `stripe_cs_${session.id}`;
  const existing = await TransactionModel.findOne({ reference });
  if (!existing) {
    await TransactionModel.create({
      user: user._id,
      amount: finalPrice,
      planType,
      status: 'paid',
      reference,
      couponCode,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId,
      meta: {
        stripeCustomerId
      }
    });
  }

  await UserModel.findByIdAndUpdate(user._id, {
    subscriptionStatus: 'premium',
    stripeCustomerId
  });
};

const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice): Promise<void> => {
  const invoiceSubscription = (invoice as any).subscription as string | undefined;
  const stripeSubscriptionId = typeof invoiceSubscription === 'string' ? invoiceSubscription : undefined;
  const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : undefined;
  if (!stripeSubscriptionId || !stripeCustomerId) {
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const interval = (stripeSubscription as any).items?.data?.[0]?.price?.recurring?.interval as string | undefined;
  const planType = getPlanTypeFromStripeInterval(interval);
  const amountPaid = centsToAmount(invoice.amount_paid || 0);
  const currentPeriodEnd = (stripeSubscription as any).current_period_end as number | undefined;
  const expiryDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000)
    : calculateExpiryByPlan(planType);

  let localSubscription = (await SubscriptionModel.findOne({
    stripeSubscriptionId
  })) as unknown as SubscriptionDocument | null;
  let userId: string | undefined = localSubscription?.user?.toString();
  if (!userId) {
    const resolvedUser = await resolveUserForWebhook(undefined, stripeCustomerId);
    userId = resolvedUser?._id?.toString();
  }
  if (!userId) {
    return;
  }

  localSubscription = await upsertLocalSubscription({
    userId,
    planType,
    price: amountPaid,
    expiryDate,
    stripeCustomerId,
    stripeSubscriptionId,
    status: toSubscriptionStatus((stripeSubscription as any).status as Stripe.Subscription.Status)
  });
  if (!localSubscription) {
    return;
  }

  const reference = `stripe_inv_${invoice.id}`;
  const existing = await TransactionModel.findOne({ reference });
  if (!existing) {
    await TransactionModel.create({
      user: localSubscription.user,
      amount: amountPaid,
      planType,
      status: 'paid',
      reference,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId,
      meta: {
        stripeCustomerId
      }
    });
  }

  await syncUserSubscriptionStatus(userId);
};

const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice): Promise<void> => {
  const invoiceSubscription = (invoice as any).subscription as string | undefined;
  const stripeSubscriptionId = typeof invoiceSubscription === 'string' ? invoiceSubscription : undefined;
  if (!stripeSubscriptionId) {
    return;
  }

  const localSubscription = (await SubscriptionModel.findOne({
    stripeSubscriptionId
  })) as unknown as SubscriptionDocument | null;
  if (!localSubscription) {
    return;
  }

  const reference = `stripe_inv_failed_${invoice.id}`;
  const existing = await TransactionModel.findOne({ reference });
  if (!existing) {
    await TransactionModel.create({
      user: localSubscription.user,
      amount: centsToAmount(invoice.amount_due || 0),
      planType: localSubscription.planType,
      status: 'failed',
      reference,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId
    });
  }
};

const handleSubscriptionStateChanged = async (subscription: Stripe.Subscription): Promise<void> => {
  const stripeSubscriptionId = subscription.id;
  const local = (await SubscriptionModel.findOne({
    stripeSubscriptionId
  })) as unknown as SubscriptionDocument | null;
  if (!local) {
    return;
  }

  const nextStatus = toSubscriptionStatus(subscription.status);
  const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;
  const nextExpiry = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000)
    : local.expiryDate;

  local.status = nextStatus;
  local.expiryDate = nextExpiry;
  await local.save();
  await syncUserSubscriptionStatus(local.user.toString());
};

export const getPlans = async (): Promise<PlanPrice[]> => {
  const pricing = await getPricingContext();
  return [buildPlanPrice(PLAN_TYPES.MONTHLY, pricing), buildPlanPrice(PLAN_TYPES.YEARLY, pricing)];
};

export const getPricingSettings = async (): Promise<PricingSettingsResponse> => {
  const settings = await getOrCreatePricingSettings();
  return {
    monthlyPriceCents: settings.monthlyPriceCents,
    yearlyPriceCents: settings.yearlyPriceCents,
    currency: settings.currency,
    updatedAt: settings.updatedAt
  };
};

export const updatePricingSettings = async (input: {
  monthlyPriceCents?: number;
  yearlyPriceCents?: number;
  currency?: string;
  adminId: string;
}): Promise<PricingSettingsResponse> => {
  const settings = await getOrCreatePricingSettings();

  if (input.monthlyPriceCents !== undefined) {
    settings.monthlyPriceCents = input.monthlyPriceCents;
  }
  if (input.yearlyPriceCents !== undefined) {
    settings.yearlyPriceCents = input.yearlyPriceCents;
  }
  if (input.currency !== undefined) {
    settings.currency = input.currency;
  }
  settings.updatedBy = input.adminId as any;
  await settings.save();

  return {
    monthlyPriceCents: settings.monthlyPriceCents,
    yearlyPriceCents: settings.yearlyPriceCents,
    currency: settings.currency,
    updatedAt: settings.updatedAt
  };
};

export const getSubscriptionQuote = async ({ planType, couponCode }: QuoteInput): Promise<QuoteResult> => {
  return getQuoteInternal({ planType, couponCode });
};

export const createCheckoutSession = async ({
  userId,
  planType,
  couponCode
}: CreateCheckoutSessionInput): Promise<{
  checkoutSessionId: string;
  checkoutUrl: string | null;
  quote: QuoteResult;
}> => {
  ensureStripeConfigured('checkout');
  ensureValidPlanType(planType);

  const quote = await getQuoteInternal({ planType, couponCode });
  const { stripeCustomerId } = await getOrCreateStripeCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    success_url: config.stripe.successUrl,
    cancel_url: config.stripe.cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: quote.currency,
          unit_amount: quote.finalPriceCents,
          recurring: { interval: parsePlanInterval(planType) },
          product_data: {
            name: planType === PLAN_TYPES.YEARLY ? 'Fitco Premium Yearly' : 'Fitco Premium Monthly'
          }
        }
      }
    ],
    metadata: {
      userId,
      planType,
      basePriceCents: String(quote.basePriceCents),
      finalPriceCents: String(quote.finalPriceCents),
      discountPercentage: String(quote.discountPercentage),
      couponCode: quote.couponCode || ''
    }
  });

  return {
    checkoutSessionId: session.id,
    checkoutUrl: session.url,
    quote
  };
};

export const processStripeWebhook = async (payload: Buffer, signature: string): Promise<Stripe.Event> => {
  ensureStripeConfigured('webhook');
  const event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionStateChanged(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  return event;
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
