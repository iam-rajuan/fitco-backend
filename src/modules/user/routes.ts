import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { blockUser, getUserDetails, listUsers, unblockUser } from './controller';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));

router.get('/', listUsers);
router.get('/:id', getUserDetails);
router.patch('/:id/block', blockUser);
router.patch('/:id/unblock', unblockUser);

export default router;