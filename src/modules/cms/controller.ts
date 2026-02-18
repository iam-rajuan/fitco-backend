import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as cmsService from './service';
import validate from '../../middlewares/validationMiddleware';

const upsertValidators = [
  body('key').isIn(['terms', 'privacy', 'about']),
  body('title').notEmpty(),
  body('content').notEmpty()
];

const getValidators = [param('key').isIn(['terms', 'privacy', 'about'])];

export const upsertContent = [
  ...upsertValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const content = await cmsService.upsertContent(req.body.key, req.body);
    res.json(content);
  })
];

export const getContent = [
  ...getValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const content = await cmsService.getContent(req.params.key as 'terms' | 'privacy' | 'about');
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  })
];

export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const data = await cmsService.listContent();
  res.json(data);
});
