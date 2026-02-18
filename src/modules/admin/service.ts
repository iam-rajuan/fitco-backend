import AdminModel, { AdminDocument } from './model';

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