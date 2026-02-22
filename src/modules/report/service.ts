import ReportModel, { ReportDocument } from './model';
import UserModel from '../user/model';

interface CreateReportInput {
  userId: string;
  issueType?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactInfo?: string;
}

export const createReport = ({
  userId,
  issueType,
  description,
  contactName,
  contactEmail,
  contactInfo
}: CreateReportInput): Promise<ReportDocument> => {
  return ReportModel.create({
    user: userId,
    issueType: issueType || 'other',
    description: description || '',
    contactName,
    contactEmail,
    contactInfo: contactInfo || ''
  });
};

export const listReports = (): Promise<ReportDocument[]> => {
  return ReportModel.find().populate('user', 'name email').sort({ createdAt: -1 });
};

export const markReportInProgress = async (reportId: string): Promise<ReportDocument | null> => {
  return ReportModel.findByIdAndUpdate(reportId, { status: 'in_progress' }, { new: true }).populate('user', 'name email');
};

export const markReportResolved = async (reportId: string): Promise<ReportDocument | null> => {
  return ReportModel.findByIdAndUpdate(reportId, { status: 'resolved' }, { new: true }).populate('user', 'name email');
};

export const disableReportedUser = async (reportId: string, userId: string): Promise<ReportDocument | null> => {
  await UserModel.findByIdAndUpdate(userId, { isBlocked: true, refreshTokens: [] });
  return ReportModel.findByIdAndUpdate(reportId, { status: 'in_progress' }, { new: true }).populate('user', 'name email');
};

export const unblockReportedUser = async (reportId: string, userId: string): Promise<ReportDocument | null> => {
  await UserModel.findByIdAndUpdate(userId, { isBlocked: false });
  return ReportModel.findByIdAndUpdate(reportId, { status: 'in_progress' }, { new: true }).populate('user', 'name email');
};
