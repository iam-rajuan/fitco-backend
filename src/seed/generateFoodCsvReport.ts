import fs from 'fs';
import path from 'path';
import { parseFoodCsv } from '../modules/foodDatabase/csv';

const csvEscape = (value: unknown): string => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const run = async (): Promise<void> => {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    throw new Error('CSV file path argument is required.');
  }

  const resolvedPath = path.resolve(filePathArg);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSV file not found: ${resolvedPath}`);
  }

  const csvContent = fs.readFileSync(resolvedPath, 'utf8');
  const results = parseFoodCsv(csvContent);
  const validRows = results.filter((row) => row.data);
  const invalidRows = results.filter((row) => !row.data);

  const normalizedOutputPath = resolvedPath.replace(/\.csv$/i, '') + '.normalized.csv';
  const errorsOutputPath = resolvedPath.replace(/\.csv$/i, '') + '.errors.csv';

  const normalizedLines = [
    'brand,product,servingSize,servingUnit,calories,protein,carbs,fat,barcode',
    ...validRows.map((row) => {
      const data = row.data!;
      return [
        csvEscape(data.brand),
        csvEscape(data.product),
        csvEscape(data.servingSize),
        csvEscape(data.servingUnit),
        csvEscape(data.calories),
        csvEscape(data.protein),
        csvEscape(data.carbs),
        csvEscape(data.fat),
        csvEscape(data.barcode || '')
      ].join(',');
    })
  ];

  const errorLines = [
    'rowNumber,error,rawLine',
    ...invalidRows.map((row) => [csvEscape(row.rowNumber), csvEscape(row.error || ''), csvEscape(row.rawLine || '')].join(','))
  ];

  fs.writeFileSync(normalizedOutputPath, normalizedLines.join('\n'), 'utf8');
  fs.writeFileSync(errorsOutputPath, errorLines.join('\n'), 'utf8');

  console.log(
    JSON.stringify(
      {
        source: resolvedPath,
        normalizedOutputPath,
        errorsOutputPath,
        validRowCount: validRows.length,
        invalidRowCount: invalidRows.length
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error('Failed to generate food CSV report', error);
  process.exit(1);
});
