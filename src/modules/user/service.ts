import UserModel, { UserDocument } from './model';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

interface ListParams {
  page?: number | string;
  limit?: number | string;
  blocked?: boolean;
}

export const ACTIVITY_LEVEL_OPTIONS = [
  { key: 'standard', label: 'Standard', description: 'Little to no exercise (desk job)' },
  { key: 'sedentary', label: 'Sedentary', description: 'Little to no exercise (desk job)' },
  { key: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { key: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { key: 'very_active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  { key: 'extremely_active', label: 'Extremely Active', description: 'Very hard exercise or physical job' }
] as const;

export const GOAL_OPTIONS = [
  { key: 'lose_weight', label: 'Lose Weight', description: 'Create a calorie deficit to lose weight' },
  { key: 'maintain_weight', label: 'Maintain Weight', description: 'Keep your current weight stable' },
  { key: 'gain_weight', label: 'Gain Weight', description: 'Increase calories to gain weight' },
  { key: 'build_muscle', label: 'Build Muscle', description: 'Focus on protein and strength training' }
] as const;

export type ActivityLevelKey = (typeof ACTIVITY_LEVEL_OPTIONS)[number]['key'];
export type GoalKey = (typeof GOAL_OPTIONS)[number]['key'];

interface ProfilePayload {
  age?: number;
  height?: number;
  currentWeight?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: ActivityLevelKey;
  goal?: GoalKey;
}

interface HealthPayload {
  medicalConditions?: string;
  foodAllergies?: string;
}

export const getUsers = async ({ page = 1, limit = 20, blocked }: ListParams): Promise<PaginatedResult<UserDocument>> => {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const skip = (pageNumber - 1) * limitNumber;
  const query: Record<string, unknown> = {};

  if (typeof blocked === 'boolean') {
    query.isBlocked = blocked;
  }

  const [data, total] = await Promise.all([
    UserModel.find(query).select('-password -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
    UserModel.countDocuments(query)
  ]);
  return {
    data,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber) || 1
    }
  };
};

export const getUserById = (id: string): Promise<UserDocument | null> => {
  return UserModel.findById(id).select('-password -refreshTokens');
};

export const setUserBlockStatus = (id: string, isBlocked: boolean): Promise<UserDocument | null> => {
  const update: Record<string, unknown> = { isBlocked };
  if (isBlocked) {
    // Revoke all active sessions so blocked users cannot refresh existing tokens.
    update.refreshTokens = [];
  }
  return UserModel.findByIdAndUpdate(id, update, { new: true }).select('-password -refreshTokens');
};

export const getMyProfile = (id: string): Promise<UserDocument | null> => {
  return UserModel.findById(id).select('-password -refreshTokens');
};

export const updateProfile = (id: string, payload: ProfilePayload): Promise<UserDocument | null> => {
  const update: Record<string, any> = {};
  if (payload.age !== undefined) update.age = payload.age;
  if (payload.height !== undefined) update.height = payload.height;
  if (payload.currentWeight !== undefined) {
    update.currentWeight = payload.currentWeight;
    update.weight = payload.currentWeight;
  }
  if (payload.gender !== undefined) update.gender = payload.gender;
  if (payload.activityLevel !== undefined) update.activityLevel = payload.activityLevel;
  if (payload.goal !== undefined) {
    update.goal = payload.goal;
    update.goals = payload.goal;
  }

  return UserModel.findByIdAndUpdate(id, update, { new: true }).select('-password -refreshTokens');
};

export const updateHealthInfo = (id: string, payload: HealthPayload): Promise<UserDocument | null> => {
  const update: Record<string, any> = {};
  if (payload.medicalConditions !== undefined) update.medicalConditions = payload.medicalConditions;
  if (payload.foodAllergies !== undefined) update.foodAllergies = payload.foodAllergies;
  return UserModel.findByIdAndUpdate(id, update, { new: true }).select('-password -refreshTokens');
};
