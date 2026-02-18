import ReportModel, { ReportDocument } from './model';

interface CreateReportInput {
  userId: string;
  issueType: string;
  description: string;
  contactInfo: string;
}

export const createReport = ({ userId, issueType, description, contactInfo }: CreateReportInput): Promise<ReportDocument> => {
  return ReportModel.create({ user: userId, issueType, description, contactInfo });
};

export const listReports = (): Promise<ReportDocument[]> => {
  return ReportModel.find().populate('user', 'name email').sort({ createdAt: -1 });
};