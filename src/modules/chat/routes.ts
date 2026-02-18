import { Router } from 'express';
import { sendMessage, getHistory } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { chatLimiter } from '../../middlewares/rateLimiters';
import { ROLES } from '../../utils/constants';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.USER));
router.post('/', chatLimiter, sendMessage);
router.get('/history', getHistory);

export default router;