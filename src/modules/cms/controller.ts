import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as cmsService from './service';
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

const upsertValidators = [
  body('key').isIn(['terms', 'privacy', 'about']),
  body('title').notEmpty(),
  body('content').notEmpty()
];

const getValidators = [param('key').isIn(['terms', 'privacy', 'about'])];
const textValidators = [allowOnlyFields(['text']), body('text').isString().trim().notEmpty()];

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

export const updatePrivacyPolicy = [
  ...textValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const content = await cmsService.updateTextByKey('privacy', req.body.text);
    res.json({ key: content.key, text: content.content, updatedAt: content.updatedAt });
  })
];

export const updateTermsConditions = [
  ...textValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const content = await cmsService.updateTextByKey('terms', req.body.text);
    res.json({ key: content.key, text: content.content, updatedAt: content.updatedAt });
  })
];

export const updateAboutUs = [
  ...textValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const content = await cmsService.updateTextByKey('about', req.body.text);
    res.json({ key: content.key, text: content.content, updatedAt: content.updatedAt });
  })
];
