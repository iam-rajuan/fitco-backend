import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as subscriptionService from './service';
import validate from '../../middlewares/validationMiddleware';
import { getSingleQueryParam } from '../../utils/query';

const createValidators = [
  body('planType').isIn(['monthly', 'yearly']),
  body('price').isFloat({ gt: 0 }).toFloat(),
  body('couponCode').optional().isString()
];

export const createSubscription = [
  ...createValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await subscriptionService.createSubscription({
      userId: req.auth!.id,
      planType: req.body.planType,
      price: req.body.price,
      couponCode: req.body.couponCode
    });
    res.status(201).json(subscription);
  })
];

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
