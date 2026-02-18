import AdminModel from '../modules/admin/model';

const seedAdmin = async (): Promise<void> => {
  const email = 'admin@creedtng.com';
  const existing = await AdminModel.findOne({ email });
  if (existing) {
    return;
  }
  await AdminModel.create({ email, password: 'Admin@123', name: 'Super Admin' });
  console.log('Default admin seeded');
};

export default seedAdmin;