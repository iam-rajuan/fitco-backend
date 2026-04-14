import mongoose from 'mongoose';
import FoodDatabaseModel, { FOOD_SERVING_UNITS, FoodDatabaseDocument, FoodServingUnit } from './model';
import { parseFoodCsv } from './csv';

export { FOOD_SERVING_UNITS };

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface FoodListSummary {
  totalItems: number;
  avgCalories: number;
  avgProtein: number;
}

export interface PaginatedFoodResult {
  data: FoodDatabaseDocument[];
  pagination: PaginationMeta;
  summary: FoodListSummary;
}

export interface FoodPayload {
  brand?: string;
  product: string;
  servingSize: number;
  servingUnit: FoodServingUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string;
  createdByUser?: string;
}

export interface FoodCsvImportResult {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  normalizedRows: FoodPayload[];
  errors: Array<{ rowNumber: number; error: string; rawLine?: string }>;
}

interface ListParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
}

const createHttpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });

const normalizeBarcode = (barcode?: string): string | undefined => {
  const value = String(barcode || '').trim();
  return value || undefined;
};

const normalizePayload = (payload: FoodPayload): FoodPayload => {
  const servingUnit = FOOD_SERVING_UNITS.includes(payload.servingUnit) ? payload.servingUnit : 'g';
  const createdByUser = payload.createdByUser && mongoose.isValidObjectId(payload.createdByUser) ? String(payload.createdByUser) : undefined;

  return {
    brand: String(payload.brand || '').trim(),
    product: String(payload.product || '').trim(),
    servingSize: Number(payload.servingSize),
    servingUnit,
    calories: Number(payload.calories),
    protein: Number(payload.protein),
    carbs: Number(payload.carbs),
    fat: Number(payload.fat),
    barcode: normalizeBarcode(payload.barcode),
    createdByUser
  };
};

const buildSearchQuery = (search?: string): Record<string, unknown> => {
  const normalizedSearch = String(search || '').trim();
  if (!normalizedSearch) {
    return {};
  }

  const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: [{ brand: regex }, { product: regex }, { barcode: regex }]
  };
};

const ensureBarcodeAvailable = async (barcode?: string, excludeId?: string): Promise<void> => {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) return;

  const existing = await FoodDatabaseModel.findOne({ barcode: normalizedBarcode }).select('_id');
  if (existing && existing._id.toString() !== excludeId) {
    throw createHttpError('This barcode is already in use. Please use a unique barcode.', 409);
  }
};

const ensureBarcodeIndexIsUnique = async (): Promise<void> => {
  const indexes = await FoodDatabaseModel.collection.indexes();
  const barcodeIndex = indexes.find((index) => index.name === 'barcode_1');

  if (!barcodeIndex) {
    await FoodDatabaseModel.collection.createIndex({ barcode: 1 }, { unique: true, sparse: true, name: 'barcode_1' });
    return;
  }

  if (!barcodeIndex.unique) {
    await FoodDatabaseModel.collection.dropIndex('barcode_1');
    await FoodDatabaseModel.collection.createIndex({ barcode: 1 }, { unique: true, sparse: true, name: 'barcode_1' });
  }
};

export const listFoods = async ({ page = 1, limit = 10, search = '' }: ListParams): Promise<PaginatedFoodResult> => {
  const pageNumber = Math.max(1, Number(page) || 1);
  const limitNumber = Math.max(1, Math.min(100, Number(limit) || 10));
  const skip = (pageNumber - 1) * limitNumber;
  const query = buildSearchQuery(search);

  const [data, total, aggregates] = await Promise.all([
    FoodDatabaseModel.find(query).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(limitNumber),
    FoodDatabaseModel.countDocuments(query),
    FoodDatabaseModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          avgCalories: { $avg: '$calories' },
          avgProtein: { $avg: '$protein' }
        }
      }
    ])
  ]);

  const summaryRow = aggregates[0] || {};

  return {
    data,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber) || 1
    },
    summary: {
      totalItems: Number(summaryRow.totalItems || 0),
      avgCalories: Math.round(Number(summaryRow.avgCalories || 0)),
      avgProtein: Number(Number(summaryRow.avgProtein || 0).toFixed(1))
    }
  };
};

export const createFood = async (payload: FoodPayload): Promise<FoodDatabaseDocument> => {
  const normalizedPayload = normalizePayload(payload);
  await ensureBarcodeAvailable(normalizedPayload.barcode);
  return FoodDatabaseModel.create(normalizedPayload);
};

export const getFoodById = (id: string): Promise<FoodDatabaseDocument | null> => {
  return FoodDatabaseModel.findById(id);
};

export const getFoodByBarcode = (barcode: string): Promise<FoodDatabaseDocument | null> => {
  return FoodDatabaseModel.findOne({ barcode: normalizeBarcode(barcode) }).sort({ createdAt: -1, _id: -1 });
};

export const updateFood = async (id: string, payload: Partial<FoodPayload>): Promise<FoodDatabaseDocument | null> => {
  const existing = await FoodDatabaseModel.findById(id);
  if (!existing) {
    return null;
  }

  const nextPayload = normalizePayload({
    brand: payload.brand ?? existing.brand,
    product: payload.product ?? existing.product,
    servingSize: payload.servingSize ?? existing.servingSize,
    servingUnit: payload.servingUnit ?? existing.servingUnit,
    calories: payload.calories ?? existing.calories,
    protein: payload.protein ?? existing.protein,
    carbs: payload.carbs ?? existing.carbs,
    fat: payload.fat ?? existing.fat,
    barcode: payload.barcode ?? existing.barcode
  });

  await ensureBarcodeAvailable(nextPayload.barcode, id);
  return FoodDatabaseModel.findByIdAndUpdate(id, nextPayload, { new: true });
};

export const deleteFood = async (id: string): Promise<boolean> => {
  const deleted = await FoodDatabaseModel.findByIdAndDelete(id);
  return Boolean(deleted);
};

export const importFoodsFromCsv = async (csvContent: string): Promise<FoodCsvImportResult> => {
  await ensureBarcodeIndexIsUnique();
  const parsedRows = parseFoodCsv(csvContent);
  const errors: Array<{ rowNumber: number; error: string; rawLine?: string }> = [];
  const normalizedRows: FoodPayload[] = [];
  let importedCount = 0;
  const updatedCount = 0;

  for (const row of parsedRows) {
    if (!row.data) {
      errors.push({ rowNumber: row.rowNumber, error: row.error || 'Invalid row.', rawLine: row.rawLine });
      continue;
    }

    const normalizedPayload = normalizePayload(row.data);
    await ensureBarcodeAvailable(normalizedPayload.barcode);
    normalizedRows.push(normalizedPayload);
    await FoodDatabaseModel.create(normalizedPayload);
    importedCount += 1;
  }

  return {
    importedCount,
    updatedCount,
    skippedCount: errors.length,
    normalizedRows,
    errors
  };
};
