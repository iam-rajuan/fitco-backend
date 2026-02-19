import { Router } from 'express';
import { getOverview, getRevenueStats, getTotals, getUserRatio, listRecentUsers, listTransactions } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/overview', getOverview);
router.get('/totals', getTotals);
router.get('/user-ratio', getUserRatio);
router.get('/recent-users', listRecentUsers);
router.get('/transactions', listTransactions);
router.get('/revenue', getRevenueStats);

export default router;
