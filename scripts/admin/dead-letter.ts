#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Dead-Letter Queue Management
// Usage: tsx scripts/admin/dead-letter.ts [list|retry|purge] [--limit 20] [--id <uuid>]
// =============================================================================

import {
  getPrisma,
  parseArgs,
  formatTable,
  formatDate,
  hasHelp,
  exitWithError,
  truncate,
} from './_shared.js';

const USAGE = `
SavSpot Admin — Dead-Letter Queue Management

Usage:
  tsx scripts/admin/dead-letter.ts <command> [options]

Commands:
  list    Show dead-letter webhook entries
  retry   Re-process a specific dead letter by ID
  purge   Delete all dead letters older than 30 days

Options:
  --limit <N>     Max entries to show for list command (default: 20)
  --id <UUID>     Dead letter ID for retry command
  --help          Show this help message

Examples:
  tsx scripts/admin/dead-letter.ts list
  tsx scripts/admin/dead-letter.ts list --limit 50
  tsx scripts/admin/dead-letter.ts retry --id abc123-def456
  tsx scripts/admin/dead-letter.ts purge
`.trim();

async function listDeadLetters(limit: number): Promise<void> {
  const prisma = getPrisma();

  const deadLetters = await prisma.webhookDeadLetter.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      webhookLog: {
        select: {
          eventType: true,
          gateway: true,
          eventId: true,
        },
      },
    },
  });

  if (deadLetters.length === 0) {
    console.log('\nNo dead-letter entries found.\n');
    return;
  }

  const headers = [
    'ID',
    'Gateway',
    'Event Type',
    'Error',
    'Retries',
    'Resolved',
    'Created At',
  ];

  const rows = deadLetters.map((dl) => [
    truncate(dl.id, 12),
    dl.webhookLog.gateway,
    dl.webhookLog.eventType,
    truncate(dl.finalError, 40),
    String(dl.retryCount),
    dl.resolved ? 'Yes' : 'No',
    formatDate(dl.createdAt),
  ]);

  console.log(`\nDead-Letter Queue (${deadLetters.length} entries):\n`);
  console.log(formatTable(headers, rows));

  const unresolvedCount = deadLetters.filter((dl) => !dl.resolved).length;
  console.log(`\n  Unresolved: ${unresolvedCount} / ${deadLetters.length} shown`);
  console.log();
}

async function retryDeadLetter(id: string): Promise<void> {
  const prisma = getPrisma();

  const deadLetter = await prisma.webhookDeadLetter.findUnique({
    where: { id },
    include: {
      webhookLog: true,
    },
  });

  if (!deadLetter) {
    exitWithError(`Dead letter with ID "${id}" not found.`);
  }

  if (deadLetter.resolved) {
    exitWithError(`Dead letter "${id}" is already resolved.`);
  }

  // Reset the webhook log so it can be reprocessed
  await prisma.$transaction([
    prisma.paymentWebhookLog.update({
      where: { id: deadLetter.webhookLogId },
      data: {
        processed: false,
        processingError: null,
        retryCount: { increment: 1 },
      },
    }),
    prisma.webhookDeadLetter.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
      },
    }),
  ]);

  console.log(`\nDead letter "${truncate(id, 36)}" has been queued for retry.`);
  console.log(`  Event Type: ${deadLetter.webhookLog.eventType}`);
  console.log(`  Gateway: ${deadLetter.webhookLog.gateway}`);
  console.log(`  Retry Count: ${deadLetter.retryCount + 1}`);
  console.log(`\nNote: The webhook worker will pick this up on its next processing cycle.\n`);
}

async function purgeOldDeadLetters(): Promise<void> {
  const prisma = getPrisma();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const result = await prisma.webhookDeadLetter.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  console.log(
    `\nPurged ${result.count} dead-letter entries older than 30 days (before ${cutoffDate.toISOString().slice(0, 10)}).\n`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (hasHelp(args)) {
    console.log(USAGE);
    return;
  }

  const command = args.positional[0];

  if (!command) {
    console.log(USAGE);
    exitWithError('Please specify a command: list, retry, or purge');
  }

  switch (command) {
    case 'list': {
      const limit = parseInt(args.flags['limit'] ?? '20', 10);
      if (isNaN(limit) || limit < 1) {
        exitWithError('--limit must be a positive number');
      }
      await listDeadLetters(limit);
      break;
    }

    case 'retry': {
      const id = args.flags['id'];
      if (!id) {
        exitWithError('--id is required for retry command');
      }
      await retryDeadLetter(id);
      break;
    }

    case 'purge': {
      await purgeOldDeadLetters();
      break;
    }

    default:
      exitWithError(`Unknown command "${command}". Use list, retry, or purge.`);
  }

  const prisma = getPrisma();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
