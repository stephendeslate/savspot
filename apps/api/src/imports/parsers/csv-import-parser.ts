import { Readable } from 'stream';
import csvParser from 'csv-parser';

export async function parseCsv(
  data: string | Buffer,
  columnMapping?: Record<string, string> | null,
): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];

  const stream = Readable.from(
    typeof data === 'string' ? Buffer.from(data) : data,
  );

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on('data', (row: Record<string, string>) => {
        if (columnMapping) {
          const mapped: Record<string, string> = {};
          for (const [csvCol, fieldName] of Object.entries(columnMapping)) {
            if (row[csvCol] !== undefined) {
              mapped[fieldName] = row[csvCol];
            }
          }
          rows.push(mapped);
        } else {
          rows.push(row);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  return rows;
}
