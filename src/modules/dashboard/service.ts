import UserModel from '../user/model';
import SubscriptionModel from '../subscription/model';
import TransactionModel from '../subscription/transaction.model';
import { SUBSCRIPTION_STATUS } from '../../utils/constants';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

interface ListParams {
  page?: number | string;
  limit?: number | string;
}

export const getOverview = async () => {
  const [totalUsers, activeSubscriptions, revenueAgg, monthlyRevenueAgg] = await Promise.all([
    UserModel.countDocuments(),
    SubscriptionModel.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE, expiryDate: { $gt: new Date() } }),
    TransactionModel.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    TransactionModel.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  return {
    totalUsers,
    activeSubscriptions,
    totalRevenue: revenueAgg[0]?.total || 0,
    monthlyRevenue: monthlyRevenueAgg.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      total: item.total
    }))
  };
};

export const listTransactions = async ({ page = 1, limit = 20 }: ListParams): Promise<PaginatedResult<any>> => {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const skip = (pageNumber - 1) * limitNumber;
  const [data, total] = await Promise.all([
    TransactionModel.find().populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
    TransactionModel.countDocuments()
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

export const getRevenueStats = async () => {
  const stats = await TransactionModel.aggregate([
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: '$planType',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  return stats;
};