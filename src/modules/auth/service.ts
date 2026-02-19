import crypto from 'crypto';
import { JwtPayload } from 'jsonwebtoken';
import UserModel, { UserDocument } from '../user/model';
import AdminModel, { AdminDocument } from '../admin/model';
import AuthTokenModel from './model';
import * as adminService from '../admin/service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../../utils/token';
import { ROLES, Role } from '../../utils/constants';
import { sendPasswordResetEmail } from '../../utils/mailer';

interface AuthResponse {
  user: SanitizedAccount;
  accessToken: string;
  refreshToken: string;
}

interface SanitizedAccount {
  id: string;
  email: string;
  role: Role;
  name?: string;
  firstName?: string;
  lastName?: string;
}

type AccountDocument = UserDocument | AdminDocument;

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const sanitizeAccount = (account: AccountDocument): SanitizedAccount => ({
  id: account._id.toString(),
  email: account.email,
  role: account.role as Role,
  name: account.name,
  firstName: (account as any).firstName,
  lastName: (account as any).lastName
});

const buildTokensPayload = (account: AccountDocument): TokenPayload => ({
  sub: account._id.toString(),
  role: account.role as Role
});

const persistRefreshToken = async (account: AccountDocument, token: string, decoded: JwtPayload): Promise<void> => {
  const expiresAt = new Date((decoded.exp || 0) * 1000);
  const filtered = (account.refreshTokens || []).filter((item: any) => item.expiresAt > new Date());
  filtered.push({ token, expiresAt } as any);
  account.refreshTokens = filtered;
  await account.save();
};

const hashResetCode = (code: string): string => crypto.createHash('sha256').update(code).digest('hex');

export const registerUser = async (payload: RegisterPayload): Promise<SanitizedAccount> => {
  const existing = await UserModel.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    const error = new Error('Email already registered');
    (error as any).statusCode = 400;
    throw error;
  }
  const user = await UserModel.create({
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    name: `${payload.firstName.trim()} ${payload.lastName.trim()}`,
    email: payload.email.toLowerCase(),
    password: payload.password
  });
  return sanitizeAccount(user);
};

export const loginUser = async ({ email, password }: { email: string; password: string }): Promise<AuthResponse | null> => {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return null;
  }
  const matches = await user.comparePassword(password);
  if (!matches) {
    return null;
  }
  if (user.isBlocked) {
    const error = new Error('Account is blocked');
    (error as any).statusCode = 403;
    throw error;
  }
  const accessToken = generateAccessToken(buildTokensPayload(user));
  const refreshToken = generateRefreshToken(buildTokensPayload(user));
  const decoded = verifyRefreshToken(refreshToken);
  await persistRefreshToken(user, refreshToken, decoded);
  return { user: sanitizeAccount(user), accessToken, refreshToken };
};

export const loginAdmin = async ({ email, password }: { email: string; password: string }): Promise<AuthResponse | null> => {
  const admin = await adminService.authenticate(email.toLowerCase(), password);
  if (!admin) {
    return null;
  }
  const accessToken = generateAccessToken(buildTokensPayload(admin));
  const refreshToken = generateRefreshToken(buildTokensPayload(admin));
  const decoded = verifyRefreshToken(refreshToken);
  await persistRefreshToken(admin, refreshToken, decoded);
  return { user: sanitizeAccount(admin), accessToken, refreshToken };
};

export const refreshTokens = async (token: string): Promise<AuthResponse> => {
  const payload = verifyRefreshToken(token);
  const account =
    payload.role === ROLES.ADMIN
      ? await AdminModel.findById(payload.sub)
      : await UserModel.findById(payload.sub);
  if (!account) {
    const error = new Error('Invalid token');
    (error as any).statusCode = 401;
    throw error;
  }
  const stored = (account.refreshTokens || []).find((item) => item.token === token && item.expiresAt > new Date());
  if (!stored) {
    const error = new Error('Refresh token revoked');
    (error as any).statusCode = 401;
    throw error;
  }
  account.refreshTokens = (account.refreshTokens || []).filter((item: any) => item.token !== token);
  const accessToken = generateAccessToken(buildTokensPayload(account));
  const newRefreshToken = generateRefreshToken(buildTokensPayload(account));
  const decoded = verifyRefreshToken(newRefreshToken);
  await persistRefreshToken(account, newRefreshToken, decoded);
  return { user: sanitizeAccount(account), accessToken, refreshToken: newRefreshToken };
};

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return;
  }
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const tokenHash = hashResetCode(otp);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await AuthTokenModel.deleteMany({ user: user._id, type: 'password_reset', used: false });
  await AuthTokenModel.create({ user: user._id, token: tokenHash, type: 'password_reset', expiresAt });
  await sendPasswordResetEmail({ email: user.email, otp });
};

export const verifyResetOtp = async (email: string, otp: string): Promise<void> => {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }

  const tokenHash = hashResetCode(otp);
  const record = await AuthTokenModel.findOne({
    user: user._id,
    token: tokenHash,
    type: 'password_reset',
    used: false
  });

  if (!record || record.expiresAt < new Date()) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const tokenHash = hashResetCode(token);
  const record = await AuthTokenModel.findOne({ token: tokenHash, type: 'password_reset', used: false });
  if (!record || record.expiresAt < new Date()) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }
  const user = await UserModel.findById(record.user);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }
  user.password = newPassword;
  await user.save();
  record.used = true;
  await record.save();
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }
  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    const error = new Error('Invalid current password');
    (error as any).statusCode = 400;
    throw error;
  }
  user.password = newPassword;
  await user.save();
};

export const deleteAccount = async (userId: string): Promise<void> => {
  await UserModel.findByIdAndDelete(userId);
};
