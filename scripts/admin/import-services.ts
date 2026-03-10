#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Import Services from CSV
// Usage: pnpm admin:import-services <tenant-id> <csv-file> [--dry-run] [--skip-duplicates] [--update-existing] [--source-platform CSV_GENERIC] [--admin-user-id <uuid>]
// =============================================================================

import * as fs from 'fs';
import * as readline from 'readline';
import { getPrisma, parseArgs, hasHelp, exitWithError } from './_shared.js';

const VALID_SOURCE_PLATFORMS = [
  'BOOKSY',
  'FRESHA',
  'SQUARE',
  'VAGARO',
  'MINDBODY',
  'CSV_GENERIC',
  'JSON_GENERIC',
] as const;

type SourcePlatformKey = (typeof VALID_SOURCE_PLATFORMS)[number];

const HELP = `
SavSpot Admin — Import Services from CSV

Usage:
  pnpm admin:import-services <tenant-id> <csv-file> [options]

Options:
  --dry-run                       Validate and show what would be imported without writing to DB
  --skip-duplicates               Skip rows where the service name already exists for this tenant
  --update-existing               Update existing service records with CSV data
  --source-platform <platform>    Source platform for column mapping (default: CSV_GENERIC)
                                  Valid: BOOKSY, FRESHA, SQUARE, VAGARO, MINDBODY, CSV_GENERIC, JSON_GENERIC
  --admin-user-id <uuid>          User ID of the admin initiating the import (optional, for ImportJob tracking)
  --help, -h                      Show this help message

CSV Format (CSV_GENERIC):
  name,duration_minutes,price,currency,description,category
  Haircut,30,25.00,USD,Standard haircut,Hair
  Color Treatment,120,150.00,USD,Full color service,Hair

Platform-Specific Formats:
  BOOKSY:   Service Name,Duration,Price,Currency,Description,Category
  FRESHA:   Treatment Name,Duration (min),Price,Currency,Description,Category
  SQUARE:   Item Name,Duration,Price,Currency,Description,Category
  VAGARO:   Service,Duration,Price,Currency,Description,Category
  MINDBODY: Name,Duration,Price,Currency,Description,Category

Examples:
  pnpm admin:import-services tenant_abc123 ./services.csv --dry-run
  pnpm admin:import-services tenant_abc123 ./services.csv --skip-duplicates
  pnpm admin:import-services tenant_abc123 ./services.csv --source-platform BOOKSY
  pnpm admin:import-services tenant_abc123 ./services.csv --update-existing --admin-user-id <uuid>
`.trim();

// ---------------------------------------------------------------------------
// Platform-specific column mappings
// ---------------------------------------------------------------------------

const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  BOOKSY: {
    'service name': 'name',
    duration: 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
  FRESHA: {
    'treatment name': 'name',
    'duration (min)': 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
  SQUARE: {
    'item name': 'name',
    duration: 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
  VAGARO: {
    service: 'name',
    duration: 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
  MINDBODY: {
    name: 'name',
    duration: 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
  CSV_GENERIC: {
    name: 'name',
    duration_minutes: 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
  JSON_GENERIC: {
    name: 'name',
    duration_minutes: 'duration_minutes',
    price: 'price',
    currency: 'currency',
    description: 'description',
    category: 'category',
  },
};

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCsvLine(line: string, headers: string[]): Record<string, string> {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    row[headers[i]!] = values[i] ?? '';
  }
  return row;
}

/**
 * Apply platform-specific column mapping to normalize header names.
 */
function applyColumnMapping(
  rawHeaders: string[],
  sourcePlatform: string,
): string[] {
  const mapping = COLUMN_MAPPINGS[sourcePlatform] ?? COLUMN_MAPPINGS['CSV_GENERIC']!;
  return rawHeaders.map((h) => {
    const lower = h.toLowerCase();
    return mapping[lower] ?? lower;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const parsed = parseArgs();

  if (hasHelp(parsed)) {
    console.log(HELP);
    return;
  }

  const tenantId = parsed.positional[0];
  const csvFile = parsed.positional[1];
  const dryRun = parsed.booleans.has('dry-run');
  const skipDuplicates = parsed.booleans.has('skip-duplicates');
  const updateExisting = parsed.booleans.has('update-existing');
  const sourcePlatform = (
    parsed.flags['source-platform'] ?? 'CSV_GENERIC'
  ).toUpperCase() as SourcePlatformKey;
  const adminUserId = parsed.flags['admin-user-id'] ?? null;

  if (!tenantId || !csvFile) {
    exitWithError(
      'Usage: pnpm admin:import-services <tenant-id> <csv-file> [--dry-run] [--skip-duplicates] [--update-existing] [--source-platform CSV_GENERIC]',
    );
  }

  if (!VALID_SOURCE_PLATFORMS.includes(sourcePlatform)) {
    exitWithError(
      `Invalid source platform: "${sourcePlatform}". Valid values: ${VALID_SOURCE_PLATFORMS.join(', ')}`,
    );
  }

  if (!fs.existsSync(csvFile)) {
    exitWithError(`File not found: ${csvFile}`);
  }

  if (skipDuplicates && updateExisting) {
    exitWithError('Cannot use --skip-duplicates and --update-existing together');
  }

  const prisma = getPrisma();

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    exitWithError(`Tenant not found: ${tenantId}`);
  }

  console.log(`\nImporting services for tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Source platform: ${sourcePlatform}`);
  if (dryRun) console.log('[DRY RUN] No changes will be made\n');

  // Create ImportJob record (skip in dry-run mode)
  let importJobId: string | null = null;
  if (!dryRun) {
    const importJob = await prisma.importJob.create({
      data: {
        tenantId,
        sourcePlatform,
        importType: 'SERVICES',
        status: 'PROCESSING',
        fileUrl: csvFile,
        ...(adminUserId ? { initiatedBy: adminUserId } : {}),
      },
    });
    importJobId = importJob.id;
    console.log(`ImportJob created: ${importJobId}`);
  }

  // Read CSV
  const fileStream = fs.createReadStream(csvFile, 'utf-8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  let lineNum = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Cache existing services for deduplication (case-insensitive by name within tenant)
  const existingServices = await prisma.service.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const serviceByName = new Map<string, { id: string; name: string }>();
  for (const svc of existingServices) {
    serviceByName.set(svc.name.toLowerCase(), svc);
  }

  // Cache existing categories for this tenant
  const existingCategories = await prisma.serviceCategory.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const categoryByName = new Map<string, string>();
  for (const cat of existingCategories) {
    categoryByName.set(cat.name.toLowerCase(), cat.id);
  }

  for await (const line of rl) {
    lineNum++;

    // Skip empty lines
    if (!line.trim()) continue;

    // First non-empty line is headers
    if (headers.length === 0) {
      const rawHeaders = line.split(',').map((h) => h.trim().toLowerCase());
      headers = applyColumnMapping(rawHeaders, sourcePlatform);

      // Validate required headers
      if (!headers.includes('name')) {
        exitWithError(
          `CSV must have a "name" column. Found headers: ${rawHeaders.join(', ')}`,
        );
      }
      continue;
    }

    const row = parseCsvLine(line, headers);
    const rawData = { ...row };
    const name = (row['name'] ?? '').trim();
    const durationStr = (row['duration_minutes'] ?? '').trim();
    const priceStr = (row['price'] ?? '').trim();
    const currency = (row['currency'] ?? 'USD').trim().toUpperCase();
    const description = (row['description'] ?? '').trim() || null;
    const categoryName = (row['category'] ?? '').trim() || null;

    // Validate required fields
    if (!name) {
      const errorMsg = `Line ${lineNum}: missing service name`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'services',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    const durationMinutes = durationStr ? parseInt(durationStr, 10) : 60;
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      const errorMsg = `Line ${lineNum}: invalid duration "${durationStr}" for service "${name}"`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'services',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    const price = priceStr ? parseFloat(priceStr) : 0;
    if (isNaN(price) || price < 0) {
      const errorMsg = `Line ${lineNum}: invalid price "${priceStr}" for service "${name}"`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'services',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    // Check for existing service (case-insensitive name match within tenant)
    const existingService = serviceByName.get(name.toLowerCase());

    // --- Dry run: report what would happen ---
    if (dryRun) {
      if (existingService) {
        if (skipDuplicates) {
          console.log(`  SKIP:   "${name}" (already exists)`);
          skipped++;
        } else if (updateExisting) {
          console.log(`  UPDATE: "${name}"`);
          updated++;
        } else {
          console.log(`  EXISTS: "${name}" (use --skip-duplicates or --update-existing)`);
          skipped++;
        }
      } else {
        console.log(`  CREATE: "${name}" (${durationMinutes}min, ${currency} ${price.toFixed(2)})`);
        created++;
      }
      continue;
    }

    // --- Actual import ---
    try {
      // Resolve category if provided
      let categoryId: string | null = null;
      if (categoryName) {
        const existingCategoryId = categoryByName.get(categoryName.toLowerCase());
        if (existingCategoryId) {
          categoryId = existingCategoryId;
        } else {
          // Create the category
          const newCategory = await prisma.serviceCategory.create({
            data: {
              tenantId,
              name: categoryName,
            },
          });
          categoryId = newCategory.id;
          categoryByName.set(categoryName.toLowerCase(), categoryId);
        }
      }

      let recordStatus: 'IMPORTED' | 'SKIPPED_DUPLICATE' | 'ERROR';
      let targetId: string | null = null;

      if (existingService) {
        if (skipDuplicates) {
          skipped++;
          recordStatus = 'SKIPPED_DUPLICATE';
          targetId = existingService.id;
          if (importJobId) {
            await prisma.importRecord.create({
              data: {
                importJobId,
                rowNumber: lineNum,
                status: recordStatus,
                targetTable: 'services',
                targetId,
                rawData,
              },
            });
          }
          continue;
        }

        if (updateExisting) {
          await prisma.service.update({
            where: { id: existingService.id },
            data: {
              durationMinutes,
              basePrice: String(price),
              currency,
              ...(description !== null ? { description } : {}),
              ...(categoryId ? { categoryId } : {}),
            },
          });
          updated++;
          recordStatus = 'IMPORTED';
          targetId = existingService.id;
        } else {
          skipped++;
          recordStatus = 'SKIPPED_DUPLICATE';
          targetId = existingService.id;
          if (importJobId) {
            await prisma.importRecord.create({
              data: {
                importJobId,
                rowNumber: lineNum,
                status: recordStatus,
                targetTable: 'services',
                targetId,
                rawData,
              },
            });
          }
          continue;
        }
      } else {
        const newService = await prisma.service.create({
          data: {
            tenantId,
            name,
            durationMinutes,
            basePrice: String(price),
            currency,
            description,
            ...(categoryId ? { categoryId } : {}),
          },
        });
        created++;
        recordStatus = 'IMPORTED';
        targetId = newService.id;
        // Update local cache
        serviceByName.set(name.toLowerCase(), { id: newService.id, name: newService.name });
      }

      // Create ImportRecord
      if (importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: recordStatus,
            targetTable: 'services',
            targetId,
            rawData,
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Line ${lineNum} ("${name}"): ${msg}`);
      errorCount++;
      if (importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'services',
            rawData,
            errorMessage: msg,
          },
        });
      }
    }
  }

  // --- Update ImportJob on completion ---
  if (!dryRun && importJobId) {
    const dataRows = lineNum - 1;
    const allErrored = dataRows > 0 && errorCount === dataRows;
    await prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: allErrored ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
        stats: {
          totalRows: dataRows,
          created,
          updated,
          skipped,
          errors: errorCount,
        },
        ...(errors.length > 0 ? { errorLog: errors } : {}),
      },
    });
  }

  // --- Summary ---
  const dataRows = lineNum - 1; // subtract header line
  console.log('\n--- Import Summary ---');
  console.log(`Total rows:  ${dataRows}`);
  console.log(`Created:     ${created}`);
  console.log(`Updated:     ${updated}`);
  console.log(`Skipped:     ${skipped}`);
  console.log(`Errors:      ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
  }

  if (dryRun) {
    console.log('\n(Dry run -- no changes were made)');
  } else if (importJobId) {
    console.log(`\nImportJob ID: ${importJobId}`);
  }

  console.log();
  await prisma.$disconnect();
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
