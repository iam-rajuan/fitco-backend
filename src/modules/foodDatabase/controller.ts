import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import { getSingleQueryParam } from '../../utils/query';
import validate from '../../middlewares/validationMiddleware';
import * as foodDatabaseService from './service';
import { FOOD_SERVING_UNITS } from './model';

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

const createValidators = [
  allowOnlyFields(['brand', 'product', 'servingSize', 'servingUnit', 'calories', 'protein', 'carbs', 'fat', 'barcode']),
  body('brand').isString().trim().notEmpty(),
  body('product').isString().trim().notEmpty(),
  body('servingSize').isFloat({ gt: 0 }),
  body('servingUnit').isIn(FOOD_SERVING_UNITS as unknown as string[]),
  body('calories').isFloat({ min: 0 }),
  body('protein').isFloat({ min: 0 }),
  body('carbs').isFloat({ min: 0 }),
  body('fat').isFloat({ min: 0 }),
  body('barcode').optional({ values: 'falsy' }).isString().trim().notEmpty()
];

const importCsvValidators = [
  allowOnlyFields(['csvContent']),
  body('csvContent').isString().trim().notEmpty()
];

const updateValidators = [
  allowOnlyFields(['brand', 'product', 'servingSize', 'servingUnit', 'calories', 'protein', 'carbs', 'fat', 'barcode']),
  body().custom((value) => {
    if (Object.keys(value).length === 0) {
      throw new Error('At least one field is required');
    }
    return true;
  }),
  body('brand').optional().isString().trim().notEmpty(),
  body('product').optional().isString().trim().notEmpty(),
  body('servingSize').optional().isFloat({ gt: 0 }),
  body('servingUnit').optional().isIn(FOOD_SERVING_UNITS as unknown as string[]),
  body('calories').optional().isFloat({ min: 0 }),
  body('protein').optional().isFloat({ min: 0 }),
  body('carbs').optional().isFloat({ min: 0 }),
  body('fat').optional().isFloat({ min: 0 }),
  body('barcode').optional({ values: 'falsy' }).isString().trim().notEmpty()
];

export const listFoods = asyncHandler(async (req: Request, res: Response) => {
  const page = getSingleQueryParam(req.query.page) ?? '1';
  const limit = getSingleQueryParam(req.query.limit) ?? '10';
  const search = getSingleQueryParam(req.query.search) ?? '';
  const result = await foodDatabaseService.listFoods({ page, limit, search });
  res.json(result);
});

export const getFoodById = asyncHandler(async (req: Request, res: Response) => {
  const food = await foodDatabaseService.getFoodById(req.params.id as string);
  if (!food) {
    return res.status(404).json({ message: 'Food item not found' });
  }
  res.json(food);
});

export const getFoodByBarcode = asyncHandler(async (req: Request, res: Response) => {
  const food = await foodDatabaseService.getFoodByBarcode(req.params.barcode as string);
  if (!food) {
    return res.status(404).json({ message: 'Food item not found' });
  }
  res.json(food);
});

export const createFood = [
  ...createValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const food = await foodDatabaseService.createFood(req.body);
    res.status(201).json(food);
  })
];

export const importFoodsFromCsv = [
  ...importCsvValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await foodDatabaseService.importFoodsFromCsv(req.body.csvContent);
    res.status(201).json(result);
  })
];

export const updateFood = [
  ...updateValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const food = await foodDatabaseService.updateFood(req.params.id as string, req.body);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(food);
  })
];

export const deleteFood = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await foodDatabaseService.deleteFood(req.params.id as string);
  if (!deleted) {
    return res.status(404).json({ message: 'Food item not found' });
  }
  res.status(204).send();
});
