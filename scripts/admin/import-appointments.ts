#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Import Appointments from CSV
// Usage: pnpm admin:import-appointments <tenant-id> <csv-file> [--dry-run] [--source-platform CSV_GENERIC] [--admin-user-id <uuid>]
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
SavSpot Admin — Import Appointments from CSV

Usage:
  pnpm admin:import-appointments <tenant-id> <csv-file> [options]

Options:
  --dry-run                       Validate and show what would be imported without writing to DB
  --source-platform <platform>    Source platform for column mapping (default: CSV_GENERIC)
                                  Valid: BOOKSY, FRESHA, SQUARE, VAGARO, MINDBODY, CSV_GENERIC, JSON_GENERIC
  --admin-user-id <uuid>          User ID of the admin initiating the import (optional, for ImportJob tracking)
  --help, -h                      Show this help message

CSV Format (CSV_GENERIC):
  client_email,service_name,start_time,end_time,notes
  john@example.com,Haircut,2025-12-01T10:00:00Z,2025-12-01T10:30:00Z,Regular appointment
  jane@example.com,Color Treatment,2025-12-01T14:00:00Z,2025-12-01T16:00:00Z,

Platform-Specific Formats:
  BOOKSY:   Client Email,Service,Start,End,Notes
  FRESHA:   Email,Treatment,Start Time,End Time,Notes
  SQUARE:   Customer Email,Service Name,Start DateTime,End DateTime,Notes
  VAGARO:   Client Email,Service,Appointment Start,Appointment End,Notes
  MINDBODY: ClientEmail,ServiceName,StartDateTime,EndDateTime,Notes

Notes:
  - Clients must already exist (matched by email). Rows with unknown clients are logged as errors.
  - Services must already exist for this tenant (matched by name). Rows with unknown services are logged as errors.
  - Imported bookings are created with status COMPLETED and source IMPORT.
  - No payments, invoices, or calendar events are created for imported appointments.
  - Appointments are immutable imports (no --update-existing flag).

Examples:
  pnpm admin:import-appointments tenant_abc123 ./appointments.csv --dry-run
  pnpm admin:import-appointments tenant_abc123 ./appointments.csv --source-platform BOOKSY
  pnpm admin:import-appointments tenant_abc123 ./appointments.csv --admin-user-id <uuid>
`.trim();

// ---------------------------------------------------------------------------
// Platform-specific column mappings
// ---------------------------------------------------------------------------

const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  BOOKSY: {
    'client email': 'client_email',
    service: 'service_name',
    start: 'start_time',
    end: 'end_time',
    notes: 'notes',
  },
  FRESHA: {
    email: 'client_email',
    treatment: 'service_name',
    'start time': 'start_time',
    'end time': 'end_time',
    notes: 'notes',
  },
  SQUARE: {
    'customer email': 'client_email',
    'service name': 'service_name',
    'start datetime': 'start_time',
    'end datetime': 'end_time',
    notes: 'notes',
  },
  VAGARO: {
    'client email': 'client_email',
    service: 'service_name',
    'appointment start': 'start_time',
    'appointment end': 'end_time',
    notes: 'notes',
  },
  MINDBODY: {
    clientemail: 'client_email',
    servicename: 'service_name',
    startdatetime: 'start_time',
    enddatetime: 'end_time',
    notes: 'notes',
  },
  CSV_GENERIC: {
    client_email: 'client_email',
    service_name: 'service_name',
    start_time: 'start_time',
    end_time: 'end_time',
    notes: 'notes',
  },
  JSON_GENERIC: {
    client_email: 'client_email',
    service_name: 'service_name',
    start_time: 'start_time',
    end_time: 'end_time',
    notes: 'notes',
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
  const sourcePlatform = (
    parsed.flags['source-platform'] ?? 'CSV_GENERIC'
  ).toUpperCase() as SourcePlatformKey;
  const adminUserId = parsed.flags['admin-user-id'] ?? null;

  if (!tenantId || !csvFile) {
    exitWithError(
      'Usage: pnpm admin:import-appointments <tenant-id> <csv-file> [--dry-run] [--source-platform CSV_GENERIC]',
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

  const prisma = getPrisma();

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    exitWithError(`Tenant not found: ${tenantId}`);
  }

  console.log(`\nImporting appointments for tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Source platform: ${sourcePlatform}`);
  if (dryRun) console.log('[DRY RUN] No changes will be made\n');

  // Pre-load clients and services for lookup
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const userByEmail = new Map<string, string>();
  for (const user of allUsers) {
    userByEmail.set(user.email.toLowerCase(), user.id);
  }

  const tenantServices = await prisma.service.findMany({
    where: { tenantId },
    select: { id: true, name: true, basePrice: true, currency: true },
  });
  const serviceByName = new Map<
    string,
    { id: string; name: string; basePrice: unknown; currency: string }
  >();
  for (const svc of tenantServices) {
    serviceByName.set(svc.name.toLowerCase(), svc);
  }

  // Create ImportJob record (skip in dry-run mode)
  let importJobId: string | null = null;
  if (!dryRun) {
    const importJob = await prisma.importJob.create({
      data: {
        tenantId,
        sourcePlatform,
        importType: 'APPOINTMENTS',
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
  let skipped = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for await (const line of rl) {
    lineNum++;

    // Skip empty lines
    if (!line.trim()) continue;

    // First non-empty line is headers
    if (headers.length === 0) {
      const rawHeaders = line.split(',').map((h) => h.trim().toLowerCase());
      headers = applyColumnMapping(rawHeaders, sourcePlatform);

      // Validate required headers
      const required = ['client_email', 'service_name', 'start_time', 'end_time'];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        exitWithError(
          `CSV missing required columns: ${missing.join(', ')}. Found headers: ${rawHeaders.join(', ')}`,
        );
      }
      continue;
    }

    const row = parseCsvLine(line, headers);
    const rawData = { ...row };
    const clientEmail = (row['client_email'] ?? '').trim().toLowerCase();
    const serviceName = (row['service_name'] ?? '').trim();
    const startTimeStr = (row['start_time'] ?? '').trim();
    const endTimeStr = (row['end_time'] ?? '').trim();
    const notes = (row['notes'] ?? '').trim() || null;

    // Validate required fields
    if (!clientEmail) {
      const errorMsg = `Line ${lineNum}: missing client_email`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    if (!serviceName) {
      const errorMsg = `Line ${lineNum}: missing service_name for ${clientEmail}`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    if (!startTimeStr || !endTimeStr) {
      const errorMsg = `Line ${lineNum}: missing start_time or end_time for ${clientEmail}/${serviceName}`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    if (isNaN(startTime.getTime())) {
      const errorMsg = `Line ${lineNum}: invalid start_time "${startTimeStr}"`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    if (isNaN(endTime.getTime())) {
      const errorMsg = `Line ${lineNum}: invalid end_time "${endTimeStr}"`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    if (endTime <= startTime) {
      const errorMsg = `Line ${lineNum}: end_time must be after start_time for ${clientEmail}/${serviceName}`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    // Resolve client by email
    const clientId = userByEmail.get(clientEmail);
    if (!clientId) {
      const errorMsg = `Line ${lineNum}: client not found for email "${clientEmail}"`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    // Resolve service by name within tenant
    const service = serviceByName.get(serviceName.toLowerCase());
    if (!service) {
      const errorMsg = `Line ${lineNum}: service not found for name "${serviceName}" in tenant ${tenantId}`;
      errors.push(errorMsg);
      errorCount++;
      if (!dryRun && importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
            rawData,
            errorMessage: errorMsg,
          },
        });
      }
      continue;
    }

    // --- Dry run: report what would happen ---
    if (dryRun) {
      console.log(
        `  CREATE: ${clientEmail} / "${serviceName}" @ ${startTimeStr} - ${endTimeStr}`,
      );
      created++;
      continue;
    }

    // --- Actual import ---
    try {
      const booking = await prisma.booking.create({
        data: {
          tenantId,
          clientId,
          serviceId: service.id,
          status: 'COMPLETED',
          startTime,
          endTime,
          totalAmount: String(service.basePrice),
          currency: service.currency,
          source: 'IMPORT',
          notes,
          metadata: {
            importedFrom: sourcePlatform,
            importJobId,
            importedAt: new Date().toISOString(),
          },
        },
      });
      created++;

      // Create ImportRecord
      if (importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'IMPORTED',
            targetTable: 'bookings',
            targetId: booking.id,
            rawData,
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Line ${lineNum} (${clientEmail}/${serviceName}): ${msg}`);
      errorCount++;
      if (importJobId) {
        await prisma.importRecord.create({
          data: {
            importJobId,
            rowNumber: lineNum,
            status: 'ERROR',
            targetTable: 'bookings',
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
