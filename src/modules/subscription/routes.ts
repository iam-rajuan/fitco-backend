import { Router } from 'express';
import {
  createCheckoutSession,
  getSubscriptionDetails,
  getSubscriptionQuote,
  listPlans,
  listSubscriptions,
  updateSubscriptionStatus,
  updateUserSubscriptionStatus
} from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.get('/plans', authenticate, authorizeRoles(ROLES.USER), listPlans);
router.post('/quote', authenticate, authorizeRoles(ROLES.USER), getSubscriptionQuote);
router.post('/checkout-session', authenticate, authorizeRoles(ROLES.USER), createCheckoutSession);
router.post('/', authenticate, authorizeRoles(ROLES.USER), createCheckoutSession);
router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), listSubscriptions);
router.patch('/user/:userId/status', authenticate, authorizeRoles(ROLES.ADMIN), updateUserSubscriptionStatus);
router.get('/:id', authenticate, authorizeRoles(ROLES.ADMIN), getSubscriptionDetails);
router.patch('/:id/status', authenticate, authorizeRoles(ROLES.ADMIN), updateSubscriptionStatus);

export default router;
