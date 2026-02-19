import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { forgotPassword, getProfile, resetPasswordWithOtp, updatePassword, updateProfile, verifyResetOtp } from './controller';

const router = Router();

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPasswordWithOtp);

router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/password', updatePassword);

export default router;
