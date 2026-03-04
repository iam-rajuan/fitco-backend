import { FOOD_SERVING_UNITS, FoodServingUnit } from './model';

interface ParsedFoodPayload {
  brand: string;
  product: string;
  servingSize: number;
  servingUnit: FoodServingUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string;
}

export interface ParsedFoodCsvRow {
  rowNumber: number;
  data?: ParsedFoodPayload;
  error?: string;
  rawLine?: string;
}

const EXPECTED_HEADERS = ['BRAND', 'PRODUCT', 'SERVING SIZE', 'CALORIES', 'PROTEIN', 'CARBS', 'FAT', 'BARCODE ID'];

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (value: string): string => String(value || '').trim().toUpperCase();

const parseServingSize = (value: string): { servingSize: number; servingUnit: FoodServingUnit } | null => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(g|gm|gram|grams|ml|milliliter|milliliters|piece|pieces)$/);
  if (!match) {
    return null;
  }

  const servingSize = Number(match[1]);
  const unitMap: Record<string, FoodServingUnit> = {
    g: 'g',
    gm: 'g',
    gram: 'g',
    grams: 'g',
    ml: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    piece: 'piece',
    pieces: 'piece'
  };
  const servingUnit = unitMap[match[2]];
  if (!Number.isFinite(servingSize) || servingSize <= 0 || !FOOD_SERVING_UNITS.includes(servingUnit)) {
    return null;
  }

  return { servingSize, servingUnit };
};

const parseBarcode = (value: string): string | undefined => {
  const normalized = String(value || '').trim();
  if (!normalized) return undefined;
  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }
  return normalized;
};

const toNumber = (value: string): number | null => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/g$/g, '')
    .replace(/mg$/g, '')
    .trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

export const parseFoodCsv = (csvContent: string): ParsedFoodCsvRow[] => {
  const lines = String(csvContent || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean);

  if (!lines.length) {
    return [{ rowNumber: 1, error: 'CSV content is empty.', rawLine: '' }];
  }

  const header = parseCsvLine(lines[0]).map(normalizeHeader);
  const matchesExpectedHeader =
    header.length >= EXPECTED_HEADERS.length && EXPECTED_HEADERS.every((expected, index) => header[index] === expected);

  if (!matchesExpectedHeader) {
    return [{ rowNumber: 1, error: `CSV header must be: ${EXPECTED_HEADERS.join(', ')}`, rawLine: lines[0] }];
  }

  return lines.slice(1).map((line, lineIndex) => {
    const rowNumber = lineIndex + 2;
    const columns = parseCsvLine(line);
    if (columns.length < EXPECTED_HEADERS.length) {
      return { rowNumber, error: 'Row has missing columns.', rawLine: line };
    }

    const [brand, product, servingSizeRaw, caloriesRaw, proteinRaw, carbsRaw, fatRaw, barcodeRaw] = columns;
    const serving = parseServingSize(servingSizeRaw);
    const calories = toNumber(caloriesRaw);
    const protein = toNumber(proteinRaw);
    const carbs = toNumber(carbsRaw);
    const fat = toNumber(fatRaw);
    const barcode = parseBarcode(barcodeRaw);

    if (!String(brand || '').trim()) {
      return { rowNumber, error: 'Brand is required.', rawLine: line };
    }
    if (!String(product || '').trim()) {
      return { rowNumber, error: 'Product is required.', rawLine: line };
    }
    if (!serving) {
      return { rowNumber, error: `Invalid serving size value: ${servingSizeRaw}`, rawLine: line };
    }
    if (calories === null || protein === null || carbs === null || fat === null) {
      return { rowNumber, error: 'Calories, protein, carbs, and fat must be numeric values >= 0.', rawLine: line };
    }
    if (String(barcodeRaw || '').trim() && !barcode) {
      return { rowNumber, error: `Invalid barcode value: ${barcodeRaw}`, rawLine: line };
    }

    return {
      rowNumber,
      rawLine: line,
      data: {
        brand: String(brand || '').trim(),
        product: String(product || '').trim(),
        servingSize: serving.servingSize,
        servingUnit: serving.servingUnit,
        calories,
        protein,
        carbs,
        fat,
        barcode
      }
    };
  });
};
