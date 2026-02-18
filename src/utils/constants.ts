export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired'
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const PLAN_TYPES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
} as const;

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];