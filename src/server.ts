import app from './app';
import config from './config';
import connectDatabase from './config/database';
import seedAdmin from './seed/adminSeeder';

const start = async (): Promise<void> => {
  await connectDatabase();
  await seedAdmin();
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});