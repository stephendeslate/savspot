#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Import Clients from CSV
// Usage: pnpm admin:import-clients <tenant-id> <csv-file> [--dry-run] [--skip-duplicates] [--update-existing]
// =============================================================================

import * as fs from 'fs';
import * as readline from 'readline';
import { getPrisma, parseArgs, hasHelp, exitWithError } from './_shared.js';

const HELP = `
SavSpot Admin — Import Clients from CSV

Usage:
  pnpm admin:import-clients <tenant-id> <csv-file> [options]

Options:
  --dry-run           Validate and show what would be imported without writing to DB
  --skip-duplicates   Skip rows where the email already exists
  --update-existing   Update existing user/profile records with CSV data
  --help, -h          Show this help message

CSV Format:
  email,name,phone,tags,notes
  john@example.com,John Smith,+12125551234,"vip,regular",Great client
  jane@example.com,Jane Doe,+13105555678,new,

Examples:
  pnpm admin:import-clients tenant_abc123 ./clients.csv --dry-run
  pnpm admin:import-clients tenant_abc123 ./clients.csv --skip-duplicates
  pnpm admin:import-clients tenant_abc123 ./clients.csv --update-existing
`.trim();

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

  if (!tenantId || !csvFile) {
    exitWithError(
      'Usage: pnpm admin:import-clients <tenant-id> <csv-file> [--dry-run] [--skip-duplicates] [--update-existing]',
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

  console.log(`\nImporting clients for tenant: ${tenant.name} (${tenant.id})`);
  if (dryRun) console.log('[DRY RUN] No changes will be made\n');

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

  for await (const line of rl) {
    lineNum++;

    // Skip empty lines
    if (!line.trim()) continue;

    // First non-empty line is headers
    if (headers.length === 0) {
      headers = line.split(',').map((h) => h.trim().toLowerCase());

      // Validate required headers
      if (!headers.includes('email') || !headers.includes('name')) {
        exitWithError('CSV must have "email" and "name" columns');
      }
      continue;
    }

    const row = parseCsvLine(line, headers);
    const email = (row['email'] ?? '').trim().toLowerCase();
    const name = (row['name'] ?? '').trim();
    const phone = (row['phone'] ?? '').trim() || null;
    const tagsRaw = (row['tags'] ?? '').trim();
    const notes = (row['notes'] ?? '').trim() || null;

    // Validate required fields
    if (!email) {
      errors.push(`Line ${lineNum}: missing email`);
      errorCount++;
      continue;
    }
    if (!name) {
      errors.push(`Line ${lineNum}: missing name for ${email}`);
      errorCount++;
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Line ${lineNum}: invalid email "${email}"`);
      errorCount++;
      continue;
    }

    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // --- Dry run: report what would happen ---
    if (dryRun) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (skipDuplicates) {
          console.log(`  SKIP:   ${email} (already exists)`);
          skipped++;
        } else if (updateExisting) {
          console.log(`  UPDATE: ${email}`);
          updated++;
        } else {
          console.log(`  EXISTS: ${email} (use --skip-duplicates or --update-existing)`);
          skipped++;
        }
      } else {
        console.log(`  CREATE: ${email} (${name})`);
        created++;
      }
      continue;
    }

    // --- Actual import ---
    try {
      let existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        if (skipDuplicates) {
          skipped++;
          continue;
        }

        if (updateExisting) {
          await prisma.user.update({
            where: { email },
            data: {
              name,
              ...(phone ? { phone } : {}),
            },
          });
          updated++;
        } else {
          skipped++;
          continue;
        }
      } else {
        existingUser = await prisma.user.create({
          data: {
            email,
            name,
            phone,
            passwordHash: null,
            emailVerified: false,
            role: 'USER',
          },
        });
        created++;
      }

      // Create or update ClientProfile for this tenant
      await prisma.clientProfile.upsert({
        where: {
          tenantId_clientId: {
            tenantId,
            clientId: existingUser.id,
          },
        },
        create: {
          tenantId,
          clientId: existingUser.id,
          tags: tags.length > 0 ? tags : undefined,
          preferences: notes ? { notes } : undefined,
        },
        update: {
          ...(tags.length > 0 ? { tags } : {}),
          ...(notes ? { preferences: { notes } } : {}),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Line ${lineNum} (${email}): ${msg}`);
      errorCount++;
    }
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
  }

  console.log();
  await prisma.$disconnect();
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
