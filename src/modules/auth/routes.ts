import { Router } from 'express';
import {
  adminLogin,
  changePassword,
  deleteAccount,
  forgotPassword,
  login,
  refresh,
  register,
  resetPassword,
  verifyResetOtp
} from './controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);
router.delete('/delete-account', deleteAccount);

export default router;
