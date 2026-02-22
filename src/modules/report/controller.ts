import { Request, Response } from 'express';
import { body, ValidationChain } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler';
import * as reportService from './service';
import validate from '../../middlewares/validationMiddleware';

const ISSUE_TYPES = ['app_not_working', 'payment_issue', 'chat_problem', 'barcode_scan_issue', 'subscription_issue', 'other'];
const ISSUE_TYPE_ALIASES: Record<string, string> = {
  'app not working': 'app_not_working',
  app_not_working: 'app_not_working',
  'payment issue': 'payment_issue',
  payment_issue: 'payment_issue',
  'chat problem': 'chat_problem',
  chat_problem: 'chat_problem',
  'bar-code scan issue': 'barcode_scan_issue',
  'barcode scan issue': 'barcode_scan_issue',
  barcode_scan_issue: 'barcode_scan_issue',
  'subscription issue': 'subscription_issue',
  subscription_issue: 'subscription_issue',
  others: 'other',
  other: 'other'
};

const normalizeIssueType = (value: string): string => {
  const normalized = ISSUE_TYPE_ALIASES[String(value || '').trim().toLowerCase()];
  return normalized || String(value || '').trim().toLowerCase();
};

const createValidators: ValidationChain[] = [];
const reportActionValidators = [
  body('reportId').isString().trim().notEmpty(),
  body('userId').optional().isString().trim().notEmpty()
];

export const submitReport = [
  ...createValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const rawIssueType = typeof req.body?.issueType === 'string' ? req.body.issueType : '';
    const normalizedIssueType = normalizeIssueType(rawIssueType);
    const issueType = ISSUE_TYPES.includes(normalizedIssueType) ? normalizedIssueType : 'other';

    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const contactName = typeof req.body?.name === 'string' ? req.body.name.trim() : String(req.auth?.name || '').trim();
    const contactEmail = String(req.auth?.email || '').trim().toLowerCase();
    const requestedContactInfo = typeof req.body?.contactInfo === 'string' ? req.body.contactInfo.trim() : '';
    const derivedContactInfo = requestedContactInfo || [contactName, contactEmail].filter(Boolean).join(' | ');

    const report = await reportService.createReport({
      userId: req.auth!.id,
      issueType,
      description,
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined,
      contactInfo: derivedContactInfo
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

export const resolveReport = [
  ...reportActionValidators,
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.markReportResolved(req.body.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json({ success: true, message: 'Report resolved', report });
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
