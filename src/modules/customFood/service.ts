import FoodDatabaseModel, { FoodDatabaseDocument, FoodServingUnit } from '../foodDatabase/model';
import * as foodDatabaseService from '../foodDatabase/service';

interface CreateCustomFoodPayload {
  barcode?: string;
  foodName?: string;
  brandName?: string;
  servingSize?: string;
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
  fats?: number | string;
}

interface CustomFoodListItem {
  id: string;
  barcode?: string;
  foodName: string;
  brandName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ScanBarcodeResponse {
  source: 'database';
  id: string;
  barcode?: string;
  foodName: string;
  brandName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ListCustomFoodParams {
  userId: string;
  search?: string;
}

const createHttpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });

const normalizeBarcode = (barcode?: string): string | undefined => {
  const normalized = String(barcode || '').trim();
  return normalized || undefined;
};

const parseServingSize = (value?: string): { servingSize: number; servingUnit: FoodServingUnit } => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const match = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);

  if (!match) {
    throw createHttpError('servingSize must be like 100g, 250ml, or 1piece', 400);
  }

  const servingSize = Number(match[1]);
  const unitAliases: Record<string, FoodServingUnit> = {
    g: 'g',
    gram: 'g',
    grams: 'g',
    ml: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    piece: 'piece',
    pieces: 'piece',
    pc: 'piece',
    pcs: 'piece'
  };
  const servingUnit = unitAliases[match[2]];

  if (!Number.isFinite(servingSize) || servingSize <= 0 || !servingUnit) {
    throw createHttpError('servingSize must be like 100g, 250ml, or 1piece', 400);
  }

  return { servingSize, servingUnit };
};

const formatServingSize = (servingSize: number, servingUnit: FoodServingUnit): string => `${servingSize}${servingUnit}`;

const mapFoodToCustomFood = (food: FoodDatabaseDocument): CustomFoodListItem => ({
  id: food._id.toString(),
  barcode: food.barcode,
  foodName: food.product,
  brandName: food.brand || '',
  servingSize: formatServingSize(food.servingSize, food.servingUnit),
  calories: Number(food.calories || 0),
  protein: Number(food.protein || 0),
  carbs: Number(food.carbs || 0),
  fat: Number(food.fat || 0),
  createdAt: food.createdAt,
  updatedAt: food.updatedAt
});

const mapFoodToScanResponse = (food: FoodDatabaseDocument): ScanBarcodeResponse => ({
  source: 'database',
  id: food._id.toString(),
  barcode: food.barcode,
  foodName: food.product,
  brandName: food.brand || '',
  servingSize: formatServingSize(food.servingSize, food.servingUnit),
  calories: Number(food.calories || 0),
  protein: Number(food.protein || 0),
  carbs: Number(food.carbs || 0),
  fat: Number(food.fat || 0)
});

export const createCustomFood = async (userId: string, payload: CreateCustomFoodPayload): Promise<CustomFoodListItem> => {
  const serving = parseServingSize(payload.servingSize);
  const resolvedFat = payload.fat ?? payload.fats ?? 0;

  const food = await foodDatabaseService.createFood({
    createdByUser: userId,
    barcode: normalizeBarcode(payload.barcode),
    product: String(payload.foodName || '').trim(),
    brand: String(payload.brandName || '').trim(),
    servingSize: serving.servingSize,
    servingUnit: serving.servingUnit,
    calories: Number(payload.calories || 0),
    protein: Number(payload.protein || 0),
    carbs: Number(payload.carbs || 0),
    fat: Number(resolvedFat)
  });

  return mapFoodToCustomFood(food);
};

export const listCustomFoods = async ({ userId, search = '' }: ListCustomFoodParams): Promise<CustomFoodListItem[]> => {
  const normalizedSearch = String(search).trim();
  const query: Record<string, unknown> = { createdByUser: userId };

  if (normalizedSearch) {
    const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ product: regex }, { brand: regex }, { barcode: regex }];
  }

  const foods = await FoodDatabaseModel.find(query).sort({ createdAt: -1, _id: -1 });
  return foods.map(mapFoodToCustomFood);
};

export const scanFoodByBarcode = async (_userId: string, barcode: string): Promise<ScanBarcodeResponse> => {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    throw createHttpError('Barcode is required', 400);
  }

  const food = await FoodDatabaseModel.findOne({ barcode: normalizedBarcode }).sort({ createdAt: -1, _id: -1 });
  if (!food) {
    throw createHttpError('Food item not found for this barcode', 404);
  }

  return mapFoodToScanResponse(food);
};
