import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { getProfile, updatePassword } from './controller';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/profile', getProfile);
router.patch('/password', updatePassword);

export default router;