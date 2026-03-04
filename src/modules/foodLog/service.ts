import FoodDatabaseModel, { FoodServingUnit } from '../foodDatabase/model';
import FoodLogModel, { FOOD_LOG_MEALS, FoodLogDocument, FoodLogMeal } from './model';
import UserModel, { UserDocument } from '../user/model';

interface DailyGoalValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodLogInput {
  foodId: string;
  meal?: FoodLogMeal;
  servings?: number;
  servingSize?: number;
  servingUnit?: FoodServingUnit;
  loggedAt?: string | Date;
}

interface ListFoodLogsParams {
  userId: string;
  date?: string;
  meal?: string;
}

interface FoodPreviewResponse {
  food: {
    id: string;
    name: string;
    brandName: string;
  };
  selection: {
    meal: FoodLogMeal;
    servings: number;
    servingSize: number;
    servingUnit: FoodServingUnit;
    baseServingSize: number;
    baseServingUnit: FoodServingUnit;
    servingLabel: string;
  };
  nutrition: {
    calories: number;
    protein: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
    fat: { grams: number; percentage: number };
  };
  dailyGoals: {
    calories: { value: number; target: number; percentage: number };
    protein: { value: number; target: number; percentage: number };
    carbs: { value: number; target: number; percentage: number };
    fat: { value: number; target: number; percentage: number };
  };
}

const DEFAULT_DAILY_GOALS: DailyGoalValues = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 67
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  standard: 1.2,
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9
};

const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  lose_weight: -400,
  maintain_weight: 0,
  gain_weight: 300,
  build_muscle: 200
};

const GOAL_PROTEIN_MULTIPLIER: Record<string, number> = {
  lose_weight: 2,
  maintain_weight: 1.6,
  gain_weight: 1.8,
  build_muscle: 2.2
};

const GOAL_FAT_RATIO: Record<string, number> = {
  lose_weight: 0.25,
  maintain_weight: 0.3,
  gain_weight: 0.27,
  build_muscle: 0.25
};

const createHttpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });

const roundTo = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const formatServingLabel = (servings: number, servingSize: number, servingUnit: FoodServingUnit): string => {
  const servingsLabel = `${roundTo(servings, 2)} serving${servings === 1 ? '' : 's'}`;
  return `${servingsLabel} (${roundTo(servingSize, 2)}${servingUnit})`;
};

const calculatePercent = (value: number, target: number): number => {
  if (target <= 0) {
    return 0;
  }

  return Math.round((value / target) * 100);
};

const normalizeLoggedAt = (value?: string | Date): Date => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError('Invalid loggedAt value', 400);
  }

  return parsed;
};

const buildDailyGoals = (user: UserDocument | null): DailyGoalValues => {
  if (!user) {
    return DEFAULT_DAILY_GOALS;
  }

  const weight = Number(user.currentWeight ?? user.weight ?? 70);
  const height = Number(user.height ?? 170);
  const age = Number(user.age ?? 30);
  const activityLevel = user.activityLevel ?? 'standard';
  const goal = user.goal ?? 'maintain_weight';

  const genderOffset = user.gender === 'female' ? -161 : user.gender === 'male' ? 5 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.standard;
  const calorieTarget = Math.max(1200, Math.round(bmr * activityMultiplier + (GOAL_CALORIE_ADJUSTMENT[goal] ?? 0)));
  const proteinTarget = Math.max(60, Math.round(weight * (GOAL_PROTEIN_MULTIPLIER[goal] ?? 1.6)));
  const fatTarget = Math.max(35, Math.round((calorieTarget * (GOAL_FAT_RATIO[goal] ?? 0.3)) / 9));
  const carbCalories = calorieTarget - proteinTarget * 4 - fatTarget * 9;
  const carbTarget = Math.max(50, Math.round(carbCalories / 4));

  return {
    calories: calorieTarget,
    protein: proteinTarget,
    carbs: carbTarget,
    fat: fatTarget
  };
};

const buildPreviewFromSelection = async (userId: string, input: FoodLogInput): Promise<FoodPreviewResponse & { loggedAt: Date }> => {
  const [food, user] = await Promise.all([FoodDatabaseModel.findById(input.foodId), UserModel.findById(userId)]);

  if (!food) {
    throw createHttpError('Food item not found', 404);
  }

  const servings = Number(input.servings ?? 1);
  const servingSize = Number(input.servingSize ?? food.servingSize);
  const servingUnit = input.servingUnit ?? food.servingUnit;
  const meal = input.meal ?? 'breakfast';

  if (!FOOD_LOG_MEALS.includes(meal)) {
    throw createHttpError('Invalid meal value', 400);
  }

  if (!Number.isFinite(servings) || servings <= 0) {
    throw createHttpError('Servings must be greater than 0', 400);
  }

  if (!Number.isFinite(servingSize) || servingSize <= 0) {
    throw createHttpError('Serving size must be greater than 0', 400);
  }

  if (servingUnit !== food.servingUnit) {
    throw createHttpError(`Serving unit must match the database unit: ${food.servingUnit}`, 400);
  }

  const multiplier = (servings * servingSize) / food.servingSize;
  const calories = Math.round(food.calories * multiplier);
  const protein = roundTo(food.protein * multiplier);
  const carbs = roundTo(food.carbs * multiplier);
  const fat = roundTo(food.fat * multiplier);
  const macroTotal = protein + carbs + fat;
  const dailyGoalTargets = buildDailyGoals(user);
  const loggedAt = normalizeLoggedAt(input.loggedAt);

  return {
    food: {
      id: food._id.toString(),
      name: food.product,
      brandName: food.brand
    },
    selection: {
      meal,
      servings: roundTo(servings, 2),
      servingSize: roundTo(servingSize, 2),
      servingUnit,
      baseServingSize: roundTo(food.servingSize, 2),
      baseServingUnit: food.servingUnit,
      servingLabel: formatServingLabel(servings, servingSize, servingUnit)
    },
    nutrition: {
      calories,
      protein: {
        grams: protein,
        percentage: macroTotal > 0 ? Math.round((protein / macroTotal) * 100) : 0
      },
      carbs: {
        grams: carbs,
        percentage: macroTotal > 0 ? Math.round((carbs / macroTotal) * 100) : 0
      },
      fat: {
        grams: fat,
        percentage: macroTotal > 0 ? Math.round((fat / macroTotal) * 100) : 0
      }
    },
    dailyGoals: {
      calories: {
        value: calories,
        target: dailyGoalTargets.calories,
        percentage: calculatePercent(calories, dailyGoalTargets.calories)
      },
      protein: {
        value: protein,
        target: dailyGoalTargets.protein,
        percentage: calculatePercent(protein, dailyGoalTargets.protein)
      },
      carbs: {
        value: carbs,
        target: dailyGoalTargets.carbs,
        percentage: calculatePercent(carbs, dailyGoalTargets.carbs)
      },
      fat: {
        value: fat,
        target: dailyGoalTargets.fat,
        percentage: calculatePercent(fat, dailyGoalTargets.fat)
      }
    },
    loggedAt
  };
};

export const previewFoodLog = async (userId: string, input: FoodLogInput): Promise<FoodPreviewResponse> => {
  const preview = await buildPreviewFromSelection(userId, input);
  return preview;
};

export const createFoodLog = async (userId: string, input: FoodLogInput): Promise<FoodLogDocument> => {
  const preview = await buildPreviewFromSelection(userId, input);

  return FoodLogModel.create({
    user: userId,
    food: preview.food.id,
    foodName: preview.food.name,
    brandName: preview.food.brandName,
    meal: preview.selection.meal,
    servings: preview.selection.servings,
    servingSize: preview.selection.servingSize,
    servingUnit: preview.selection.servingUnit,
    baseServingSize: preview.selection.baseServingSize,
    baseServingUnit: preview.selection.baseServingUnit,
    calories: preview.nutrition.calories,
    protein: preview.nutrition.protein.grams,
    carbs: preview.nutrition.carbs.grams,
    fat: preview.nutrition.fat.grams,
    macroBreakdown: {
      protein: preview.nutrition.protein,
      carbs: preview.nutrition.carbs,
      fat: preview.nutrition.fat
    },
    dailyGoals: preview.dailyGoals,
    loggedAt: preview.loggedAt
  });
};

export const listFoodLogs = async ({ userId, date, meal }: ListFoodLogsParams): Promise<FoodLogDocument[]> => {
  const query: Record<string, unknown> = { user: userId };

  if (meal) {
    if (!FOOD_LOG_MEALS.includes(meal as FoodLogMeal)) {
      throw createHttpError('Invalid meal filter', 400);
    }
    query.meal = meal;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw createHttpError('Invalid date filter. Use YYYY-MM-DD.', 400);
    }

    query.loggedAt = { $gte: start, $lte: end };
  }

  return FoodLogModel.find(query).sort({ loggedAt: -1, _id: -1 });
};
