import { Router } from 'express';
import { createSubscription, getSubscriptionDetails, listSubscriptions } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.post('/', authenticate, authorizeRoles(ROLES.USER), createSubscription);
router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), listSubscriptions);
router.get('/:id', authenticate, authorizeRoles(ROLES.ADMIN), getSubscriptionDetails);

export default router;