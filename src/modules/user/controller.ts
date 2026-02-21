import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as userService from './service';
import { getSingleQueryParam } from '../../utils/query';
import validate from '../../middlewares/validationMiddleware';

const allowOnlyFields = (allowedFields: string[]) =>
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Request body must be a JSON object');
    }
    const invalidFields = Object.keys(value).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      throw new Error(`Only these fields are allowed: ${allowedFields.join(', ')}`);
    }
    return true;
  });

const profileValidators = [
  body('age').optional().isInt({ min: 1, max: 120 }),
  body('height').optional().isFloat({ min: 1, max: 300 }),
  body('currentWeight').optional().isFloat({ min: 1, max: 500 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('activityLevel').optional().isIn(userService.ACTIVITY_LEVEL_OPTIONS.map((item) => item.key)),
  body('goal').optional().isIn(userService.GOAL_OPTIONS.map((item) => item.key))
];

const healthValidators = [
  body('medicalConditions').optional().isString().trim(),
  body('foodAllergies').optional().isString().trim()
];

const activityLevelValidators = [
  allowOnlyFields(['activityLevel']),
  body('activityLevel').isIn(userService.ACTIVITY_LEVEL_OPTIONS.map((item) => item.key))
];

const goalValidators = [
  allowOnlyFields(['goal']),
  body('goal').isIn(userService.GOAL_OPTIONS.map((item) => item.key))
];

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = getSingleQueryParam(req.query.page) ?? '1';
  const limit = getSingleQueryParam(req.query.limit) ?? '20';
  const blockedQuery = getSingleQueryParam(req.query.blocked);
  const blocked =
    blockedQuery === undefined
      ? undefined
      : blockedQuery.toLowerCase() === 'true'
        ? true
        : blockedQuery.toLowerCase() === 'false'
          ? false
          : undefined;

  const result = await userService.getUsers({ page, limit, blocked });
  res.json(result);
});

export const getUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setUserBlockStatus(req.params.id as string, true);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'User blocked', user });
});

export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setUserBlockStatus(req.params.id as string, false);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'User unblocked', user });
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMyProfile(req.auth!.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

export const upsertMyProfile = [
  ...profileValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.auth!.id, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Profile updated', user });
  })
];

export const upsertMyHealthInfo = [
  ...healthValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateHealthInfo(req.auth!.id, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Health information updated', user });
  })
];

export const submitOnboarding = [
  ...profileValidators,
  ...healthValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await userService.updateProfile(req.auth!.id, req.body);
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = await userService.updateHealthInfo(req.auth!.id, req.body);
    res.json({ message: 'Onboarding information saved', user });
  })
];

export const listActivityLevels = asyncHandler(async (_req: Request, res: Response) => {
  res.json(userService.ACTIVITY_LEVEL_OPTIONS);
});

export const listGoalOptions = asyncHandler(async (_req: Request, res: Response) => {
  res.json(userService.GOAL_OPTIONS);
});

export const setMyActivityLevel = [
  ...activityLevelValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.auth!.id, { activityLevel: req.body.activityLevel });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const selection = userService.ACTIVITY_LEVEL_OPTIONS.find((item) => item.key === req.body.activityLevel);
    res.json({ message: 'Activity level updated', selection, user });
  })
];

export const setMyGoal = [
  ...goalValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.auth!.id, { goal: req.body.goal });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const selection = userService.GOAL_OPTIONS.find((item) => item.key === req.body.goal);
    res.json({ message: 'Goal updated', selection, user });
  })
];
