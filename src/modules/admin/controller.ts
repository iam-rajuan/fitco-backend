import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as adminService from './service';
import validate from '../../middlewares/validationMiddleware';

const allowOnlyFields = (allowedFields: string[]) =>
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Request body must be a JSON object');
    }
    const invalidFields = Object.keys(value).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      throw new Error(`Only these fields are allowed: ${allowedFields.join(', ')}`);
    }
    return true;
  });

const profileValidators = [
  body('name').optional().isString().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('contactNo').optional().isString().trim().notEmpty(),
  body().custom((value) => {
    if (!value || typeof value !== 'object') {
      throw new Error('Request body must be a JSON object');
    }
    if (value.name === undefined && value.email === undefined && value.contactNo === undefined) {
      throw new Error('At least one of name, email, or contactNo is required');
    }
    return true;
  })
];

const forgotValidators = [allowOnlyFields(['email']), body('email').isEmail()];
const verifyOtpValidators = [allowOnlyFields(['email', 'otp']), body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 })];
const resetValidators = [
  allowOnlyFields(['email', 'otp', 'newPassword']),
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 })
];

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminService.getById(req.auth!.id);
  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  res.json({
    id: admin._id,
    name: admin.name,
    email: admin.email,
    contactNo: admin.contactNo,
    role: admin.role,
    createdAt: admin.createdAt
  });
});

export const updateProfile = [
  ...profileValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const admin = await adminService.updateProfile(req.auth!.id, req.body);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json({
      message: 'Profile updated',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        contactNo: admin.contactNo,
        role: admin.role
      }
    });
  })
];

export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  const admin = await adminService.getById(req.auth!.id);
  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  const matches = await admin.comparePassword(currentPassword);
  if (!matches) {
    return res.status(400).json({ message: 'Invalid current password' });
  }
  await adminService.updatePassword(req.auth!.id, newPassword);
  res.json({ message: 'Password updated' });
});

export const forgotPassword = [
  ...forgotValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await adminService.forgotPassword(req.body.email);
    res.json({ message: 'If the email exists, reset instructions were sent' });
  })
];

export const verifyResetOtp = [
  ...verifyOtpValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await adminService.verifyResetOtp(req.body.email, req.body.otp);
    res.json({ message: 'OTP verified' });
  })
];

export const resetPasswordWithOtp = [
  ...resetValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await adminService.resetPasswordWithOtp(req.body.email, req.body.otp, req.body.newPassword);
    res.json({ message: 'Password updated' });
  })
];
