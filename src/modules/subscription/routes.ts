import { Router } from 'express';
import { createCheckoutSession, getSubscriptionDetails, getSubscriptionQuote, listPlans, listSubscriptions } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.get('/plans', authenticate, authorizeRoles(ROLES.USER), listPlans);
router.post('/quote', authenticate, authorizeRoles(ROLES.USER), getSubscriptionQuote);
router.post('/checkout-session', authenticate, authorizeRoles(ROLES.USER), createCheckoutSession);
router.post('/', authenticate, authorizeRoles(ROLES.USER), createCheckoutSession);
router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), listSubscriptions);
router.get('/:id', authenticate, authorizeRoles(ROLES.ADMIN), getSubscriptionDetails);

export default router;
