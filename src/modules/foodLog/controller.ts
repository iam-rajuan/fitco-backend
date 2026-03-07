import { Request, Response } from 'express';
import { body, query } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import validate from '../../middlewares/validationMiddleware';
import { getSingleQueryParam } from '../../utils/query';
import * as foodLogService from './service';
import { FOOD_SERVING_UNITS } from '../foodDatabase/model';
import { FOOD_LOG_MEALS } from './model';

const allowOnlyFields = (allowedFields: string[]) =>
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Request body must be a JSON object');
    }

    const invalidFields = Object.keys(value).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      throw new Error(`Only these fields are allowed: ${allowedFields.join(', ')}`);
    }

    return true;
  });

const previewValidators = [
  allowOnlyFields(['foodId', 'meal', 'servings', 'servingSize', 'servingUnit', 'loggedAt']),
  body('foodId').isString().trim().notEmpty(),
  body('meal').optional().isIn(FOOD_LOG_MEALS as unknown as string[]),
  body('servings').optional().isFloat({ gt: 0 }),
  body('servingSize').optional().isFloat({ gt: 0 }),
  body('servingUnit').optional().isIn(FOOD_SERVING_UNITS as unknown as string[]),
  body('loggedAt').optional().isISO8601()
];

const createValidators = [
  ...previewValidators,
  body('meal').isIn(FOOD_LOG_MEALS as unknown as string[])
];

const listValidators = [
  query('date').optional().isISO8601({ strict: true, strictSeparator: true }),
  query('meal').optional().isIn(FOOD_LOG_MEALS as unknown as string[])
];

const listLogFoodsValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim()
];

const homeValidators = [query('date').optional().isISO8601({ strict: true, strictSeparator: true })];
const weeklyValidators = [query('startDate').optional().isISO8601({ strict: true, strictSeparator: true })];

export const previewFoodLog = [
  ...previewValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const preview = await foodLogService.previewFoodLog(req.auth!.id, req.body);
    res.json(preview);
  })
];

export const createFoodLog = [
  ...createValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const foodLog = await foodLogService.createFoodLog(req.auth!.id, req.body);
    res.status(201).json(foodLog);
  })
];

export const listFoodLogs = [
  ...listValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const date = getSingleQueryParam(req.query.date);
    const meal = getSingleQueryParam(req.query.meal);
    const foodLogs = await foodLogService.listFoodLogs({ userId: req.auth!.id, date, meal });
    res.json(foodLogs);
  })
];

export const listLogFoods = [
  ...listLogFoodsValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = getSingleQueryParam(req.query.page) ?? '1';
    const limit = getSingleQueryParam(req.query.limit) ?? '20';
    const search = getSingleQueryParam(req.query.search) ?? '';
    const result = await foodLogService.listLogFoods({ userId: req.auth!.id, page, limit, search });
    res.json(result);
  })
];

export const getHomeData = [
  ...homeValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const date = getSingleQueryParam(req.query.date);
    const result = await foodLogService.getHomeData(req.auth!.id, date);
    res.json(result);
  })
];

export const getWeeklySummary = [
  ...weeklyValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const startDate = getSingleQueryParam(req.query.startDate);
    const result = await foodLogService.getWeeklySummary(req.auth!.id, startDate);
    res.json(result);
  })
];
