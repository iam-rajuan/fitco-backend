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
const reportActionValidators = [
  body('reportId').isString().trim().notEmpty(),
  body('userId').optional().isString().trim().notEmpty()
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

export const warnUserFromReport = [
  ...reportActionValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.markReportInProgress(req.body.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json({ success: true, message: 'User warned', report });
  })
];

export const disableUserFromReport = [
  ...reportActionValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.body.userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const report = await reportService.disableReportedUser(req.body.reportId, req.body.userId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json({ success: true, message: 'User disabled', report });
  })
];

export const unblockUserFromReport = [
  ...reportActionValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.body.userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const report = await reportService.unblockReportedUser(req.body.reportId, req.body.userId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json({ success: true, message: 'User unblocked', report });
  })
];
