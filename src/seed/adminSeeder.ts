import AdminModel from '../modules/admin/model';

const seedAdmin = async (): Promise<void> => {
  const email = 'admin@fitco.com';
  const existing = await AdminModel.findOne({ email });
  if (existing) {
    return;
  }
  await AdminModel.create({ email, password: 'admin@123', name: 'Super Admin' });
  console.log('Default admin seeded');
};

export default seedAdmin;