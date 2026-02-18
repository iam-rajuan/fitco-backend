import { Router } from 'express';
import { submitReport, listReports } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.post('/', authenticate, authorizeRoles(ROLES.USER), submitReport);
router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), listReports);

export default router;