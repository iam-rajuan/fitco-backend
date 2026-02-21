import { Router } from 'express';
import { disableUserFromReport, listReports, submitReport, unblockUserFromReport, warnUserFromReport } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.post('/', authenticate, authorizeRoles(ROLES.USER), submitReport);
router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), listReports);
router.post('/actions/warn', authenticate, authorizeRoles(ROLES.ADMIN), warnUserFromReport);
router.post('/actions/disable', authenticate, authorizeRoles(ROLES.ADMIN), disableUserFromReport);
router.post('/actions/unblock', authenticate, authorizeRoles(ROLES.ADMIN), unblockUserFromReport);

export default router;
