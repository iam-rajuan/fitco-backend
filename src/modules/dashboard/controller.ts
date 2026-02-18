import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import * as dashboardService from './service';
import { getSingleQueryParam } from '../../utils/query';

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getOverview();
  res.json(data);
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
