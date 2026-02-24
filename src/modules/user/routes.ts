import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import {
  blockUser,
  getMyProfile,
  getUserDetails,
  listActivityLevels,
  listGoalOptions,
  listUsers,
  setMyActivityLevel,
  setMyGoal,
  submitOnboarding,
  unblockUser,
  upsertMyCompleteProfile,
  upsertMyHealthInfo,
  upsertMyProfile
} from './controller';

const router = Router();

router.get('/me', authenticate, authorizeRoles(ROLES.USER), getMyProfile);
router.patch('/me/profile', authenticate, authorizeRoles(ROLES.USER), upsertMyProfile);
router.patch('/me/health', authenticate, authorizeRoles(ROLES.USER), upsertMyHealthInfo);
router.patch('/me/complete-profile', authenticate, authorizeRoles(ROLES.USER), upsertMyCompleteProfile);
router.post('/me/onboarding', authenticate, authorizeRoles(ROLES.USER), submitOnboarding);
router.get('/meta/activity-levels', authenticate, authorizeRoles(ROLES.USER), listActivityLevels);
router.get('/meta/goals', authenticate, authorizeRoles(ROLES.USER), listGoalOptions);
router.post('/me/activity-level', authenticate, authorizeRoles(ROLES.USER), setMyActivityLevel);
router.post('/me/goal', authenticate, authorizeRoles(ROLES.USER), setMyGoal);

router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), listUsers);
router.get('/:id', authenticate, authorizeRoles(ROLES.ADMIN), getUserDetails);
router.patch('/:id/block', authenticate, authorizeRoles(ROLES.ADMIN), blockUser);
router.patch('/:id/unblock', authenticate, authorizeRoles(ROLES.ADMIN), unblockUser);

export default router;
