#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Feedback Management
// Usage: tsx scripts/admin/feedback.ts [options]
// =============================================================================

import { FeedbackType, FeedbackStatus } from '../../prisma/generated/prisma/index.js';
import {
  getPrisma,
  parseArgs,
  formatTable,
  formatDate,
  hasHelp,
  exitWithError,
  truncate,
} from './_shared.js';

const VALID_TYPES = ['FEATURE_REQUEST', 'UX_FRICTION', 'COMPARISON_NOTE', 'GENERAL'];
const VALID_STATUSES = ['NEW', 'ACKNOWLEDGED', 'PLANNED', 'SHIPPED', 'DECLINED'];

const USAGE = `
SavSpot Admin — Feedback Management

Usage:
  tsx scripts/admin/feedback.ts [options]

Options:
  --type <TYPE>          Filter by type (${VALID_TYPES.join(', ')})
  --status <STATUS>      Filter by status (${VALID_STATUSES.join(', ')})
  --tenant <ID>          Filter by tenant ID
  --since <DATE>         Only show items after date (ISO format)
  --acknowledge <ID>     Mark a feedback item as ACKNOWLEDGED
  --limit <N>            Max number of items to show (default: 50)
  --help                 Show this help message

Examples:
  tsx scripts/admin/feedback.ts
  tsx scripts/admin/feedback.ts --type COMPARISON_NOTE
  tsx scripts/admin/feedback.ts --status NEW --since 2026-01-01
  tsx scripts/admin/feedback.ts --acknowledge 550e8400-e29b-41d4-a716-446655440000
`.trim();

async function main(): Promise<void> {
  const args = parseArgs();

  if (hasHelp(args)) {
    console.log(USAGE);
    return;
  }

  const prisma = getPrisma();

  // Handle --acknowledge
  const acknowledgeId = args.flags['acknowledge'];
  if (acknowledgeId) {
    const item = await prisma.feedback.findUnique({ where: { id: acknowledgeId } });
    if (!item) {
      exitWithError(`Feedback item "${acknowledgeId}" not found`);
    }
    await prisma.feedback.update({
      where: { id: acknowledgeId },
      data: { status: 'ACKNOWLEDGED' },
    });
    console.log(`\nFeedback ${acknowledgeId} marked as ACKNOWLEDGED.\n`);
    await prisma.$disconnect();
    return;
  }

  // Build filter
  const typeFilter = args.flags['type']?.toUpperCase() as FeedbackType | undefined;
  const statusFilter = args.flags['status']?.toUpperCase() as FeedbackStatus | undefined;
  const tenantFilter = args.flags['tenant'];
  const sinceFilter = args.flags['since'];
  const limit = parseInt(args.flags['limit'] ?? '50', 10);

  if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
    exitWithError(`Invalid type "${typeFilter}". Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
    exitWithError(`Invalid status "${statusFilter}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (isNaN(limit) || limit < 1) {
    exitWithError('--limit must be a positive number');
  }

  const where: Record<string, unknown> = {};
  if (typeFilter) where['type'] = typeFilter;
  if (statusFilter) where['status'] = statusFilter;
  if (tenantFilter) where['tenantId'] = tenantFilter;
  if (sinceFilter) {
    const sinceDate = new Date(sinceFilter);
    if (isNaN(sinceDate.getTime())) {
      exitWithError(`Invalid date "${sinceFilter}". Use ISO format (e.g. 2026-01-01)`);
    }
    where['createdAt'] = { gte: sinceDate };
  }

  const items = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      tenant: { select: { name: true } },
      submitter: { select: { email: true } },
    },
  });

  if (items.length === 0) {
    console.log('\nNo feedback items found.\n');
    await prisma.$disconnect();
    return;
  }

  const headers = ['Date', 'Type', 'Tenant', 'User', 'Body', 'Status'];

  const rows = items.map((item) => {
    const typeLabel =
      item.type === 'COMPARISON_NOTE'
        ? `[COMPETITIVE] ${item.type}`
        : item.type;

    return [
      formatDate(item.createdAt),
      typeLabel,
      truncate(item.tenant.name, 20),
      truncate(item.submitter.email, 25),
      truncate(item.body, 80),
      item.status,
    ];
  });

  const competitiveCount = items.filter((i) => i.type === 'COMPARISON_NOTE').length;

  console.log(`\nFeedback Items (${items.length} results):\n`);
  console.log(formatTable(headers, rows));

  // Summary
  const byType = items.reduce(
    (acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byStatus = items.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`\nSummary:`);
  console.log(`  Total items: ${items.length}`);
  if (competitiveCount > 0) {
    console.log(`  *** Competitive intelligence items: ${competitiveCount} ***`);
  }
  console.log(`  By type: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  By status: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
