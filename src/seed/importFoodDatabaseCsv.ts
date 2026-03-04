import fs from 'fs';
import path from 'path';
import config from '../config';
import connectDatabase from '../config/database';
import { importFoodsFromCsv } from '../modules/foodDatabase/service';

const run = async (): Promise<void> => {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    throw new Error('CSV file path argument is required.');
  }

  const resolvedPath = path.resolve(filePathArg);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSV file not found: ${resolvedPath}`);
  }

  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not configured.');
  }

  const csvContent = fs.readFileSync(resolvedPath, 'utf8');
  await connectDatabase();
  const result = await importFoodsFromCsv(csvContent);
  console.log(JSON.stringify({ file: resolvedPath, ...result }, null, 2));
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to import food database CSV', error);
  process.exit(1);
});
