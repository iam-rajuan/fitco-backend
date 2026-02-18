import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import * as adminService from './service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminService.getById(req.auth!.id);
  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  res.json({
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt
  });
});

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