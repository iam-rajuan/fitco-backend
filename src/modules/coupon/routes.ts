import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { createCoupon, deleteCoupon, listCoupons, toggleCoupon, updateCoupon } from './controller';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.post('/', createCoupon);
router.get('/', listCoupons);
router.put('/:id', updateCoupon);
router.patch('/:id/status', toggleCoupon);
router.delete('/:id', deleteCoupon);

export default router;