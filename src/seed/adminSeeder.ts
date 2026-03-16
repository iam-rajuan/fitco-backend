import AdminModel from '../modules/admin/model';

const seedAdmin = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL || 'admin@fitco.com';
  const password = process.env.ADMIN_PASSWORD || 'admin@123';
  const name = process.env.ADMIN_NAME || 'Super Admin';
  const existing = await AdminModel.findOne({ email });
  if (existing) {
    return;
  }
  await AdminModel.create({ email, password, name });
  console.log('Default admin seeded');
};

export default seedAdmin;
