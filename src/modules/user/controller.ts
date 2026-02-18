import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import * as userService from './service';
import { getSingleQueryParam } from '../../utils/query';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = getSingleQueryParam(req.query.page) ?? '1';
  const limit = getSingleQueryParam(req.query.limit) ?? '20';
  const result = await userService.getUsers({ page, limit });
  res.json(result);
});

export const getUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setUserBlockStatus(req.params.id as string, true);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'User blocked', user });
});

export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setUserBlockStatus(req.params.id as string, false);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'User unblocked', user });
});
