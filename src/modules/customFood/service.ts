import CustomFoodModel, { CustomFoodDocument } from './model';
import FoodDatabaseModel from '../foodDatabase/model';

interface CreateCustomFoodPayload {
  barcode?: string;
  foodName: string;
  brandName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat?: number;
  fats?: number;
}

interface ScanBarcodeResponse {
  source: 'custom' | 'database';
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

const normalizeCreatePayload = (payload: CreateCustomFoodPayload): Omit<CreateCustomFoodPayload, 'fats'> & { fat: number } => {
  const resolvedFat = payload.fat ?? payload.fats;
  if (resolvedFat === undefined) {
    throw createHttpError('fat is required', 400);
  }

  return {
    barcode: normalizeBarcode(payload.barcode),
    foodName: String(payload.foodName || '').trim(),
    brandName: String(payload.brandName || '').trim(),
    servingSize: String(payload.servingSize || '').trim(),
    calories: Number(payload.calories),
    protein: Number(payload.protein),
    carbs: Number(payload.carbs),
    fat: Number(resolvedFat)
  };
};

const mapCustomFoodToScanResponse = (food: CustomFoodDocument): ScanBarcodeResponse => ({
  source: 'custom',
  id: food._id.toString(),
  barcode: food.barcode,
  foodName: food.foodName,
  brandName: food.brandName,
  servingSize: food.servingSize,
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat
});

const ensureUserBarcodeAvailable = async (userId: string, barcode?: string): Promise<void> => {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    return;
  }

  const existing = await CustomFoodModel.findOne({ user: userId, barcode: normalizedBarcode }).select('_id');
  if (existing) {
    throw createHttpError('This barcode already exists in your custom foods', 409);
  }
};

export const createCustomFood = async (userId: string, payload: CreateCustomFoodPayload): Promise<CustomFoodDocument> => {
  const normalizedPayload = normalizeCreatePayload(payload);
  await ensureUserBarcodeAvailable(userId, normalizedPayload.barcode);

  return CustomFoodModel.create({
    user: userId,
    ...normalizedPayload
  });
};

export const listCustomFoods = async ({ userId, search = '' }: ListCustomFoodParams): Promise<CustomFoodDocument[]> => {
  const normalizedSearch = String(search).trim();
  const query: Record<string, unknown> = { user: userId };

  if (normalizedSearch) {
    const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ foodName: regex }, { brandName: regex }, { barcode: regex }];
  }

  return CustomFoodModel.find(query).sort({ createdAt: -1, _id: -1 });
};

export const scanFoodByBarcode = async (userId: string, barcode: string): Promise<ScanBarcodeResponse> => {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    throw createHttpError('Barcode is required', 400);
  }

  const customFood = await CustomFoodModel.findOne({ user: userId, barcode: normalizedBarcode }).sort({ createdAt: -1, _id: -1 });
  if (customFood) {
    return mapCustomFoodToScanResponse(customFood);
  }

  const dbFood = await FoodDatabaseModel.findOne({ barcode: normalizedBarcode }).sort({ createdAt: -1, _id: -1 });
  if (!dbFood) {
    throw createHttpError('Food item not found for this barcode', 404);
  }

  return {
    source: 'database',
    id: dbFood._id.toString(),
    barcode: dbFood.barcode,
    foodName: dbFood.product,
    brandName: dbFood.brand,
    servingSize: `${dbFood.servingSize}${dbFood.servingUnit}`,
    calories: dbFood.calories,
    protein: dbFood.protein,
    carbs: dbFood.carbs,
    fat: dbFood.fat
  };
};
