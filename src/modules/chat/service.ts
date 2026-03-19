import openai from '../../config/openai';
import config from '../../config';
import ChatModel, { ChatDocument } from './model';
import UserModel, { UserDocument } from '../user/model';
import * as subscriptionService from '../subscription/service';
import FoodLogModel from '../foodLog/model';
import { getWeeklySummary, WeeklySummaryResponse } from '../foodLog/service';

interface ChatResponse {
  answer: string;
  record: ChatDocument;
}

interface DailyNutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionContext {
  date: string;
  totals: DailyNutritionGoals;
  goals: DailyNutritionGoals;
  progress: DailyNutritionGoals;
  remaining: DailyNutritionGoals;
  mealsLoggedToday: number;
  recentFoods: Array<{
    foodName: string;
    meal: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    loggedAt: string;
  }>;
  streak: {
    currentDays: number;
  };
  weeklyProgress: WeeklySummaryResponse;
}

export interface ChatLimitStatus {
  subscriptionStatus: 'free' | 'premium';
  isUnlimited: boolean;
  dailyFreeLimit: number;
  paidMonthlyLimit: number;
  messagesUsedToday: number;
  messagesLeftToday: number | null;
  messagesUsedThisMonth: number;
  messagesLeftThisMonth: number | null;
}

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

const roundTo = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const clampProgress = (value: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
};

const getDateKeyUTC = (date: Date): string => date.toISOString().slice(0, 10);

const getDayWindowUTC = (date: Date): { start: Date; end: Date } => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

const getMonthWindowUTC = (date: Date): { start: Date; end: Date } => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
};

const calculateDailyGoals = (user: UserDocument): DailyNutritionGoals => {
  if (
    user.dailyCalorieGoal &&
    user.dailyProteinGoal !== undefined &&
    user.dailyCarbGoal !== undefined &&
    user.dailyFatGoal !== undefined
  ) {
    return {
      calories: Number(user.dailyCalorieGoal),
      protein: Number(user.dailyProteinGoal),
      carbs: Number(user.dailyCarbGoal),
      fat: Number(user.dailyFatGoal)
    };
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

const getCurrentLoggingStreak = async (userId: string): Promise<number> => {
  const rows = await FoodLogModel.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$loggedAt'
          }
        }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  if (rows.length === 0) return 0;

  const uniqueDates = rows.map((row) => String(row._id));
  const todayKey = getDateKeyUTC(new Date());
  const hasTodayLog = uniqueDates[0] === todayKey;
  let cursor = new Date();
  let streak = 0;
  let idx = 0;

  if (!hasTodayLog) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (idx < uniqueDates.length) {
    const expected = getDateKeyUTC(cursor);
    if (uniqueDates[idx] !== expected) {
      break;
    }
    streak += 1;
    idx += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
};

const getNutritionContext = async (userId: string, user: UserDocument): Promise<NutritionContext> => {
  const now = new Date();
  const { start, end } = getDayWindowUTC(now);
  const todayDate = getDateKeyUTC(now);
  const rollingWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  rollingWeekStart.setUTCDate(rollingWeekStart.getUTCDate() - 6);
  const weeklyStartDate = getDateKeyUTC(rollingWeekStart);

  const [totalsRow, mealsLoggedToday, recentLogs, streak, weeklyProgress] = await Promise.all([
    FoodLogModel.aggregate([
      {
        $match: {
          user: user._id,
          loggedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          calories: { $sum: '$calories' },
          protein: { $sum: '$protein' },
          carbs: { $sum: '$carbs' },
          fat: { $sum: '$fat' }
        }
      }
    ]),
    FoodLogModel.countDocuments({
      user: user._id,
      loggedAt: { $gte: start, $lte: end }
    }),
    FoodLogModel.find({ user: user._id }).sort({ loggedAt: -1, _id: -1 }).limit(5),
    getCurrentLoggingStreak(userId),
    getWeeklySummary(userId, weeklyStartDate)
  ]);

  const totals = totalsRow[0] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = calculateDailyGoals(user);

  return {
    date: todayDate,
    totals: {
      calories: roundTo(Number(totals.calories || 0), 0),
      protein: roundTo(Number(totals.protein || 0), 1),
      carbs: roundTo(Number(totals.carbs || 0), 1),
      fat: roundTo(Number(totals.fat || 0), 1)
    },
    goals,
    progress: {
      calories: clampProgress(Number(totals.calories || 0), goals.calories),
      protein: clampProgress(Number(totals.protein || 0), goals.protein),
      carbs: clampProgress(Number(totals.carbs || 0), goals.carbs),
      fat: clampProgress(Number(totals.fat || 0), goals.fat)
    },
    remaining: {
      calories: Math.max(goals.calories - Number(totals.calories || 0), 0),
      protein: roundTo(Math.max(goals.protein - Number(totals.protein || 0), 0), 1),
      carbs: roundTo(Math.max(goals.carbs - Number(totals.carbs || 0), 0), 1),
      fat: roundTo(Math.max(goals.fat - Number(totals.fat || 0), 0), 1)
    },
    mealsLoggedToday,
    recentFoods: recentLogs.map((item) => ({
      foodName: item.foodName,
      meal: item.meal,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      loggedAt: item.loggedAt.toISOString()
    })),
    streak: {
      currentDays: streak
    },
    weeklyProgress
  };
};

export const getChatLimitStatus = async (userId: string): Promise<ChatLimitStatus> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  const activeSubscription = await subscriptionService.getUserActiveSubscription(userId);
  const isPremium = Boolean(activeSubscription);
  const subscriptionStatus: 'free' | 'premium' = isPremium ? 'premium' : 'free';
  await UserModel.findByIdAndUpdate(userId, { subscriptionStatus });

  const now = new Date();
  const { start: startOfDay } = getDayWindowUTC(now);
  const { start: startOfMonth } = getMonthWindowUTC(now);
  const [messagesUsedToday, messagesUsedThisMonth] = await Promise.all([
    ChatModel.countDocuments({ user: userId, createdAt: { $gte: startOfDay } }),
    ChatModel.countDocuments({ user: userId, createdAt: { $gte: startOfMonth } })
  ]);
  const messagesLeftToday = isPremium ? null : Math.max(config.chat.freeLimit - messagesUsedToday, 0);
  const messagesLeftThisMonth = isPremium ? Math.max(config.chat.paidMonthlyLimit - messagesUsedThisMonth, 0) : null;

  return {
    subscriptionStatus,
    isUnlimited: false,
    dailyFreeLimit: config.chat.freeLimit,
    paidMonthlyLimit: config.chat.paidMonthlyLimit,
    messagesUsedToday,
    messagesLeftToday,
    messagesUsedThisMonth,
    messagesLeftThisMonth
  };
};

export const sendMessage = async (userId: string, prompt: string): Promise<ChatResponse> => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI API key missing');
    (error as any).statusCode = 500;
    throw error;
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  const activeSubscription = await subscriptionService.getUserActiveSubscription(userId);
  const isPremium = Boolean(activeSubscription);
  await UserModel.findByIdAndUpdate(userId, { subscriptionStatus: isPremium ? 'premium' : 'free' });
  const nutritionContext = await getNutritionContext(userId, user);

  const now = new Date();

  if (!isPremium) {
    const { start: startOfDay } = getDayWindowUTC(now);
    const messagesToday = await ChatModel.countDocuments({ user: userId, createdAt: { $gte: startOfDay } });
    if (messagesToday >= config.chat.freeLimit) {
      const error = new Error('Daily chat limit reached. Upgrade to premium for unlimited access.');
      (error as any).statusCode = 403;
      throw error;
    }
  } else {
    const { start: startOfMonth } = getMonthWindowUTC(now);
    const messagesThisMonth = await ChatModel.countDocuments({ user: userId, createdAt: { $gte: startOfMonth } });
    if (messagesThisMonth >= config.chat.paidMonthlyLimit) {
      const error = new Error('Monthly limit reached.');
      (error as any).statusCode = 403;
      throw error;
    }
  }

  const systemPrompt = `You are Creedtng, an AI fitness coach. Personalize guidance using this profile: Name: ${user.name}. Height: ${user.height ?? 'N/A'}. Weight: ${user.currentWeight ?? user.weight ?? 'N/A'}. Goals: ${user.goal ?? user.goals ?? 'N/A'}. Subscription: ${isPremium ? 'Premium' : 'Free'}.
Use this live nutrition context from database for factual answers:
${JSON.stringify(nutritionContext)}
If data is missing, say it clearly and avoid guessing. Provide actionable, safe fitness and nutrition advice.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  });

  const answer = completion.choices[0].message?.content || 'I am unable to respond right now.';

  const record = await ChatModel.create({
    user: userId,
    prompt,
    response: answer,
    metadata: {
      subscription: isPremium ? 'premium' : 'free',
      nutritionContext
    }
  });

  return { answer, record };
};

export const getHistory = (userId: string): Promise<ChatDocument[]> => {
  return ChatModel.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
};
