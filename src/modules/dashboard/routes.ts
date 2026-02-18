import { Router } from 'express';
import { getOverview, getRevenueStats, listTransactions } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/overview', getOverview);
router.get('/transactions', listTransactions);
router.get('/revenue', getRevenueStats);

export default router;