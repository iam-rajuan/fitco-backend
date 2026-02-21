import AdminModel, { AdminDocument } from './model';
import crypto from 'crypto';
import AdminResetTokenModel from './resetToken.model';
import { sendPasswordResetEmail } from '../../utils/mailer';

export const findByEmail = (email: string): Promise<AdminDocument | null> => {
  return AdminModel.findOne({ email });
};

export const authenticate = async (email: string, password: string): Promise<AdminDocument | null> => {
  const admin = await findByEmail(email);
  if (!admin) {
    return null;
  }
  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    return null;
  }
  return admin;
};

export const getById = (id: string): Promise<AdminDocument | null> => {
  return AdminModel.findById(id);
};

export const updatePassword = async (id: string, newPassword: string): Promise<AdminDocument | null> => {
  const admin = await AdminModel.findById(id);
  if (!admin) {
    return null;
  }
  admin.password = newPassword;
  await admin.save();
  return admin;
};

interface UpdateAdminProfilePayload {
  name?: string;
  username?: string;
  email?: string;
  contactNo?: string;
}

const hashResetCode = (code: string): string => crypto.createHash('sha256').update(code).digest('hex');

export const updateProfile = async (id: string, payload: UpdateAdminProfilePayload): Promise<AdminDocument | null> => {
  const update: Record<string, any> = {};
  const resolvedName = payload.name ?? payload.username;
  if (resolvedName !== undefined) update.name = resolvedName;
  if (payload.contactNo !== undefined) update.contactNo = payload.contactNo;

  if (payload.email !== undefined) {
    const normalizedEmail = payload.email.toLowerCase();
    const existing = await AdminModel.findOne({ email: normalizedEmail, _id: { $ne: id } });
    if (existing) {
      const error = new Error('Email already in use');
      (error as any).statusCode = 400;
      throw error;
    }
    update.email = normalizedEmail;
  }

  return AdminModel.findByIdAndUpdate(id, update, { new: true });
};

export const forgotPassword = async (email: string): Promise<void> => {
  const admin = await findByEmail(email.toLowerCase());
  if (!admin) {
    return;
  }
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const tokenHash = hashResetCode(otp);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await AdminResetTokenModel.deleteMany({ admin: admin._id, type: 'password_reset', used: false });
  await AdminResetTokenModel.create({ admin: admin._id, token: tokenHash, type: 'password_reset', expiresAt });
  await sendPasswordResetEmail({ email: admin.email, otp });
};

export const verifyResetOtp = async (email: string, otp: string): Promise<void> => {
  const admin = await findByEmail(email.toLowerCase());
  if (!admin) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }

  const tokenHash = hashResetCode(otp);
  const record = await AdminResetTokenModel.findOne({
    admin: admin._id,
    token: tokenHash,
    type: 'password_reset',
    used: false
  });

  if (!record || record.expiresAt < new Date()) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }

  if (!record.verified) {
    record.verified = true;
    await record.save();
  }
};

export const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string): Promise<void> => {
  const admin = await findByEmail(email.toLowerCase());
  if (!admin) {
    const error = new Error('Admin not found');
    (error as any).statusCode = 404;
    throw error;
  }

  const tokenHash = hashResetCode(otp);
  const record = await AdminResetTokenModel.findOne({
    admin: admin._id,
    token: tokenHash,
    type: 'password_reset',
    used: false,
    verified: true
  });

  if (!record || record.expiresAt < new Date()) {
    const error = new Error('OTP not verified or expired');
    (error as any).statusCode = 400;
    throw error;
  }

  admin.password = newPassword;
  await admin.save();

  record.used = true;
  await record.save();
};
