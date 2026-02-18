import { Router } from 'express';
import { upsertContent, getContent, listContent } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.get('/public/:key', getContent);
router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/', listContent);
router.post('/', upsertContent);

export default router;