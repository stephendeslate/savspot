#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — List Tenants
// Usage: tsx scripts/admin/list-tenants.ts [--status ACTIVE|SUSPENDED] [--limit 50]
// =============================================================================

import { TenantStatus } from '../../prisma/generated/prisma/index.js';
import {
  getPrisma,
  parseArgs,
  formatTable,
  formatCurrency,
  formatDate,
  hasHelp,
  exitWithError,
  truncate,
} from './_shared.js';

const USAGE = `
SavSpot Admin — List Tenants

Usage:
  tsx scripts/admin/list-tenants.ts [options]

Options:
  --status <STATUS>   Filter by tenant status (ACTIVE, SUSPENDED, DEACTIVATED)
  --limit <N>         Max number of tenants to show (default: 50)
  --help              Show this help message

Examples:
  tsx scripts/admin/list-tenants.ts
  tsx scripts/admin/list-tenants.ts --status ACTIVE
  tsx scripts/admin/list-tenants.ts --status SUSPENDED --limit 10
`.trim();

async function main(): Promise<void> {
  const args = parseArgs();

  if (hasHelp(args)) {
    console.log(USAGE);
    return;
  }

  const statusFilter = args.flags['status']?.toUpperCase() as TenantStatus | undefined;
  const limit = parseInt(args.flags['limit'] ?? '50', 10);

  if (statusFilter && !['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(statusFilter)) {
    exitWithError(
      `Invalid status "${statusFilter}". Must be one of: ACTIVE, SUSPENDED, DEACTIVATED`,
    );
  }

  if (isNaN(limit) || limit < 1) {
    exitWithError('--limit must be a positive number');
  }

  const prisma = getPrisma();

  const tenants = await prisma.tenant.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
      payments: {
        where: { status: 'SUCCEEDED' },
        select: { amount: true },
      },
    },
  });

  if (tenants.length === 0) {
    console.log('\nNo tenants found.\n');
    return;
  }

  const headers = [
    'ID',
    'Name',
    'Slug',
    'Category',
    'Status',
    'Bookings',
    'Revenue',
    'Created At',
  ];

  const rows = tenants.map((t) => {
    const totalRevenue = t.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    return [
      truncate(t.id, 12),
      truncate(t.name, 25),
      truncate(t.slug, 20),
      t.category,
      t.status,
      String(t._count.bookings),
      formatCurrency(totalRevenue),
      formatDate(t.createdAt),
    ];
  });

  console.log(`\nTenants (${tenants.length} results):\n`);
  console.log(formatTable(headers, rows));

  // Summary
  const totalBookings = tenants.reduce((sum, t) => sum + t._count.bookings, 0);
  const totalRevenue = tenants.reduce(
    (sum, t) =>
      sum + t.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
    0,
  );

  console.log(`\nSummary:`);
  console.log(`  Total tenants shown: ${tenants.length}`);
  console.log(`  Total bookings: ${totalBookings}`);
  console.log(`  Total revenue: ${formatCurrency(totalRevenue)}`);
  console.log();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
