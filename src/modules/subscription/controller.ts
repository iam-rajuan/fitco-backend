import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as subscriptionService from './service';
import validate from '../../middlewares/validationMiddleware';
import { getSingleQueryParam } from '../../utils/query';

const quoteValidators = [
  body('planType').isIn(['monthly', 'yearly']),
  body('couponCode').optional().isString()
];

const checkoutValidators = [...quoteValidators];

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await subscriptionService.getPlans();
  res.json({ plans });
});

export const getSubscriptionQuote = [
  ...quoteValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const quote = await subscriptionService.getSubscriptionQuote({
      planType: req.body.planType,
      couponCode: req.body.couponCode
    });
    res.json(quote);
  })
];

export const createCheckoutSession = [
  ...checkoutValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const checkout = await subscriptionService.createCheckoutSession({
      userId: req.auth!.id,
      planType: req.body.planType,
      couponCode: req.body.couponCode
    });
    res.status(201).json(checkout);
  })
];

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({ message: 'Missing stripe-signature header' });
  }
  await subscriptionService.processStripeWebhook(req.body as Buffer, signature);
  res.json({ received: true });
});

export const listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const page = getSingleQueryParam(req.query.page) ?? '1';
  const limit = getSingleQueryParam(req.query.limit) ?? '20';
  const data = await subscriptionService.listSubscriptions({ page, limit });
  res.json(data);
});

export const getSubscriptionDetails = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await subscriptionService.getSubscriptionById(req.params.id as string);
  if (!subscription) {
    return res.status(404).json({ message: 'Subscription not found' });
  }
  res.json(subscription);
});
