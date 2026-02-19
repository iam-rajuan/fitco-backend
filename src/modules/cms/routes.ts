import { Router } from 'express';
import { getContent, listContent, updateAboutUs, updatePrivacyPolicy, updateTermsConditions, upsertContent } from './controller';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const router = Router();

router.get('/public/:key', getContent);
router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/', listContent);
router.post('/', upsertContent);
router.patch('/privacy-policy', updatePrivacyPolicy);
router.patch('/terms-conditions', updateTermsConditions);
router.patch('/about-us', updateAboutUs);

export default router;
