import { Request, Response } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as reportService from './service';
import validate from '../../middlewares/validationMiddleware';

const createValidators = [
  body('issueType').notEmpty(),
  body('description').isLength({ min: 10 }),
  body('contactInfo').notEmpty()
];

export const submitReport = [
  ...createValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.createReport({
      userId: req.auth!.id,
      issueType: req.body.issueType,
      description: req.body.description,
      contactInfo: req.body.contactInfo
    });
    res.status(201).json(report);
  })
];

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await reportService.listReports();
  res.json(reports);
});