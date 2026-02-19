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

interface YearFilter {
  year?: number | string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const parseYear = (year?: number | string): number => {
  const parsed = Number(year);
  const currentYear = new Date().getFullYear();
  if (!parsed || parsed < 1970 || parsed > 3000) {
    return currentYear;
  }
  return parsed;
};

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

export const getTotals = async () => {
  const [totalUsers, revenueAgg] = await Promise.all([
    UserModel.countDocuments(),
    TransactionModel.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  return {
    totalUsers,
    totalRevenue: revenueAgg[0]?.total || 0
  };
};

export const getUserRatioByYear = async ({ year }: YearFilter) => {
  const selectedYear = parseYear(year);
  const start = new Date(selectedYear, 0, 1);
  const end = new Date(selectedYear + 1, 0, 1);

  const monthlyAgg = await UserModel.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);

  const countByMonth = new Map<number, number>();
  monthlyAgg.forEach((item) => {
    countByMonth.set(item._id.month, item.count);
  });

  const monthly = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    users: countByMonth.get(index + 1) || 0
  }));

  return {
    year: selectedYear,
    monthly,
    totalUsersInYear: monthly.reduce((sum, item) => sum + item.users, 0)
  };
};

export const listRecentUsers = async ({ page = 1, limit = 20, year }: ListParams & YearFilter): Promise<PaginatedResult<any>> => {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const skip = (pageNumber - 1) * limitNumber;

  const query: Record<string, any> = {};
  if (year !== undefined) {
    const selectedYear = parseYear(year);
    query.createdAt = {
      $gte: new Date(selectedYear, 0, 1),
      $lt: new Date(selectedYear + 1, 0, 1)
    };
  }

  const [data, total] = await Promise.all([
    UserModel.find(query)
      .select('name firstName lastName email isBlocked createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    UserModel.countDocuments(query)
  ]);

  const rows = data.map((user, index) => ({
    id: user._id.toString(),
    serial: skip + index + 1,
    fullName: user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
    email: user.email,
    joinedDate: user.createdAt,
    isBlocked: Boolean(user.isBlocked),
    actions: {
      block: `/api/v1/users/${user._id.toString()}/block`,
      unblock: `/api/v1/users/${user._id.toString()}/unblock`
    }
  }));

  return {
    data: rows,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber) || 1
    }
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
