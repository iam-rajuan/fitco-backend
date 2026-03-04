import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import validate from '../../middlewares/validationMiddleware';
import { getSingleQueryParam } from '../../utils/query';
import * as customFoodService from './service';

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

const createCustomFoodValidators = [
  allowOnlyFields(['barcode', 'foodName', 'brandName', 'servingSize', 'calories', 'protein', 'carbs', 'fat', 'fats']),
  body('barcode').optional({ values: 'falsy' }).isString().trim().notEmpty(),
  body('foodName').isString().trim().notEmpty(),
  body('brandName').isString().trim().notEmpty(),
  body('servingSize').isString().trim().notEmpty(),
  body('calories').isFloat({ min: 0 }),
  body('protein').isFloat({ min: 0 }),
  body('carbs').isFloat({ min: 0 }),
  body('fat').optional().isFloat({ min: 0 }),
  body('fats').optional().isFloat({ min: 0 }),
  body().custom((value) => {
    if (value.fat === undefined && value.fats === undefined) {
      throw new Error('fat (or fats) is required');
    }
    return true;
  })
];

export const createCustomFood = [
  ...createCustomFoodValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const customFood = await customFoodService.createCustomFood(req.auth!.id, req.body);
    res.status(201).json(customFood);
  })
];

export const listCustomFoods = asyncHandler(async (req: Request, res: Response) => {
  const search = getSingleQueryParam(req.query.search) ?? '';
  const customFoods = await customFoodService.listCustomFoods({ userId: req.auth!.id, search });
  res.json(customFoods);
});

export const scanFoodByBarcode = asyncHandler(async (req: Request, res: Response) => {
  const result = await customFoodService.scanFoodByBarcode(req.auth!.id, req.params.barcode as string);
  res.json(result);
});
