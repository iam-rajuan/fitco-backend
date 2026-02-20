import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import * as dashboardService from './service';
import { getSingleQueryParam } from '../../utils/query';
import * as subscriptionService from '../subscription/service';

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getOverview();
  res.json(data);
});

export const getTotals = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getTotals();
  res.json(data);
});

export const getUserRatio = asyncHandler(async (req: Request, res: Response) => {
  const year = getSingleQueryParam(req.query.year);
  const data = await dashboardService.getUserRatioByYear({ year });
  res.json(data);
});

export const listRecentUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = getSingleQueryParam(req.query.page) ?? '1';
  const limit = getSingleQueryParam(req.query.limit) ?? '10';
  const year = getSingleQueryParam(req.query.year);
  const data = await dashboardService.listRecentUsers({ page, limit, year });
  res.json(data);
});

export const getSubscriptionPricing = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await subscriptionService.getPricingSettings();
  res.json(settings);
});

export const updateSubscriptionPricing = asyncHandler(async (req: Request, res: Response) => {
  const { monthlyPriceCents, yearlyPriceCents, currency } = req.body as {
    monthlyPriceCents?: number;
    yearlyPriceCents?: number;
    currency?: string;
  };

  if (monthlyPriceCents === undefined && yearlyPriceCents === undefined && currency === undefined) {
    return res.status(400).json({ message: 'At least one of monthlyPriceCents, yearlyPriceCents, or currency is required' });
  }

  if (monthlyPriceCents !== undefined && (!Number.isInteger(monthlyPriceCents) || monthlyPriceCents <= 0)) {
    return res.status(400).json({ message: 'monthlyPriceCents must be a positive integer' });
  }

  if (yearlyPriceCents !== undefined && (!Number.isInteger(yearlyPriceCents) || yearlyPriceCents <= 0)) {
    return res.status(400).json({ message: 'yearlyPriceCents must be a positive integer' });
  }

  if (currency !== undefined && !/^[a-zA-Z]{3}$/.test(currency)) {
    return res.status(400).json({ message: 'currency must be a 3-letter code (e.g. usd)' });
  }

  const settings = await subscriptionService.updatePricingSettings({
    monthlyPriceCents,
    yearlyPriceCents,
    currency: currency?.toLowerCase(),
    adminId: req.auth!.id
  });

  res.json({ message: 'Subscription pricing updated', settings });
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = getSingleQueryParam(req.query.page) ?? '1';
  const limit = getSingleQueryParam(req.query.limit) ?? '20';
  const data = await dashboardService.listTransactions({ page, limit });
  res.json(data);
});

export const getRevenueStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await dashboardService.getRevenueStats();
  res.json(stats);
});
