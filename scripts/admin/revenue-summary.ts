#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Revenue Summary
// Usage: tsx scripts/admin/revenue-summary.ts [--period monthly|weekly|daily] [--from 2026-01-01] [--to 2026-03-31]
// =============================================================================

import {
  getPrisma,
  parseArgs,
  formatTable,
  formatCurrency,
  hasHelp,
  exitWithError,
} from './_shared.js';

const USAGE = `
SavSpot Admin — Revenue Summary

Usage:
  tsx scripts/admin/revenue-summary.ts [options]

Options:
  --period <PERIOD>   Grouping period: monthly, weekly, daily (default: monthly)
  --from <DATE>       Start date in YYYY-MM-DD format (default: 12 months ago)
  --to <DATE>         End date in YYYY-MM-DD format (default: today)
  --help              Show this help message

Examples:
  tsx scripts/admin/revenue-summary.ts
  tsx scripts/admin/revenue-summary.ts --period weekly --from 2026-01-01 --to 2026-03-31
  tsx scripts/admin/revenue-summary.ts --period daily --from 2026-03-01
`.trim();

type Period = 'monthly' | 'weekly' | 'daily';

function isValidPeriod(value: string): value is Period {
  return ['monthly', 'weekly', 'daily'].includes(value);
}

function parseDate(value: string): Date | null {
  const d = new Date(value + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return d;
}

function getDateTruncExpression(period: Period): string {
  switch (period) {
    case 'monthly':
      return `date_trunc('month', created_at)`;
    case 'weekly':
      return `date_trunc('week', created_at)`;
    case 'daily':
      return `date_trunc('day', created_at)`;
  }
}

function formatPeriodLabel(date: Date, period: Period): string {
  const iso = date.toISOString();
  switch (period) {
    case 'monthly':
      return iso.slice(0, 7); // YYYY-MM
    case 'weekly':
      return iso.slice(0, 10); // YYYY-MM-DD (week start)
    case 'daily':
      return iso.slice(0, 10); // YYYY-MM-DD
  }
}

interface RevenueRow {
  period: Date;
  transaction_count: bigint;
  total_volume: bigint | number;
  total_platform_fees: bigint | number;
  total_commissions: bigint | number;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (hasHelp(args)) {
    console.log(USAGE);
    return;
  }

  const period: Period = (args.flags['period'] ?? 'monthly') as Period;
  if (!isValidPeriod(period)) {
    exitWithError(
      `Invalid period "${args.flags['period']}". Must be one of: monthly, weekly, daily`,
    );
  }

  // Default date range: 12 months ago to today
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setMonth(defaultFrom.getMonth() - 12);
  defaultFrom.setDate(1);

  const fromDate = args.flags['from'] ? parseDate(args.flags['from']) : defaultFrom;
  const toDate = args.flags['to'] ? parseDate(args.flags['to']) : now;

  if (!fromDate) {
    exitWithError(`Invalid --from date: "${args.flags['from']}". Use YYYY-MM-DD format.`);
  }
  if (!toDate) {
    exitWithError(`Invalid --to date: "${args.flags['to']}". Use YYYY-MM-DD format.`);
  }

  const prisma = getPrisma();

  const dateTrunc = getDateTruncExpression(period);

  // Query succeeded payments grouped by period
  const results = await prisma.$queryRawUnsafe<RevenueRow[]>(
    `
    SELECT
      ${dateTrunc} AS period,
      COUNT(*)::bigint AS transaction_count,
      COALESCE(SUM(amount), 0) AS total_volume,
      COALESCE(SUM(platform_fee), 0) AS total_platform_fees,
      COALESCE(SUM(referral_commission), 0) AS total_commissions
    FROM payments
    WHERE status = 'SUCCEEDED'
      AND created_at >= $1
      AND created_at <= $2
    GROUP BY ${dateTrunc}
    ORDER BY period ASC
    `,
    fromDate,
    toDate,
  );

  if (results.length === 0) {
    console.log(
      `\nNo revenue data found for ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}.\n`,
    );
    await prisma.$disconnect();
    return;
  }

  // Calculate totals
  let grandTransactions = 0;
  let grandVolume = 0;
  let grandFees = 0;
  let grandCommissions = 0;

  const headers = [
    'Period',
    'Transactions',
    'Volume',
    'Platform Fees',
    'Commissions',
    'Net Revenue',
  ];

  const rows = results.map((r) => {
    const txCount = Number(r.transaction_count);
    const volume = Number(r.total_volume);
    const fees = Number(r.total_platform_fees);
    const commissions = Number(r.total_commissions);
    const netRevenue = fees - commissions;

    grandTransactions += txCount;
    grandVolume += volume;
    grandFees += fees;
    grandCommissions += commissions;

    return [
      formatPeriodLabel(new Date(r.period), period),
      String(txCount),
      formatCurrency(volume),
      formatCurrency(fees),
      formatCurrency(commissions),
      formatCurrency(netRevenue),
    ];
  });

  // Totals row
  const grandNet = grandFees - grandCommissions;
  rows.push([
    '--- TOTAL ---',
    String(grandTransactions),
    formatCurrency(grandVolume),
    formatCurrency(grandFees),
    formatCurrency(grandCommissions),
    formatCurrency(grandNet),
  ]);

  console.log(
    `\nRevenue Summary (${period}, ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}):\n`,
  );
  console.log(formatTable(headers, rows));

  console.log(`\nNotes:`);
  console.log(`  - Volume = total transaction amounts (in cents, displayed as dollars)`);
  console.log(`  - Platform Fees = fees collected by SavSpot on each transaction`);
  console.log(`  - Commissions = referral commissions paid out`);
  console.log(`  - Net Revenue = Platform Fees - Commissions`);
  console.log();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
