import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as authService from './service';
import validate from '../../middlewares/validationMiddleware';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';

const registerValidators = [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 })
];

const loginValidators = [
  body('email').isEmail(),
  body('password').notEmpty()
];

const forgotValidators = [body('email').isEmail()];
const resetValidators = [body('token').notEmpty(), body('password').isLength({ min: 8 })];
const changeValidators = [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })];

export const register = [
  ...registerValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.registerUser(req.body);
    res.status(201).json({ user });
  })
];

export const login = [
  ...loginValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await authService.loginUser(req.body);
    if (!auth) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json(auth);
  })
];

export const adminLogin = [
  ...loginValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await authService.loginAdmin(req.body);
    if (!auth) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json(auth);
  })
];

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }
  const tokens = await authService.refreshTokens(refreshToken);
  res.json(tokens);
});

export const forgotPassword = [
  ...forgotValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'If the email exists, reset instructions were sent' });
  })
];

export const resetPassword = [
  ...resetValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password updated' });
  })
];

export const changePassword = [
  authenticate,
  authorizeRoles(ROLES.USER),
  ...changeValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.auth!.id, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password updated' });
  })
];

export const deleteAccount = [
  authenticate,
  authorizeRoles(ROLES.USER),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.deleteAccount(req.auth!.id);
    res.status(204).send();
  })
];