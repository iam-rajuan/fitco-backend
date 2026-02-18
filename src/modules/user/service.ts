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
}

export const getUsers = async ({ page = 1, limit = 20 }: ListParams): Promise<PaginatedResult<UserDocument>> => {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const skip = (pageNumber - 1) * limitNumber;
  const [data, total] = await Promise.all([
    UserModel.find().select('-password -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
    UserModel.countDocuments()
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
  return UserModel.findByIdAndUpdate(id, { isBlocked }, { new: true }).select('-password -refreshTokens');
};