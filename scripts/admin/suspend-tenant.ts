#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Tenant Suspension
// Usage: tsx scripts/admin/suspend-tenant.ts [suspend|unsuspend|status] [--id tenant-uuid] [--reason "..."]
// =============================================================================

import {
  getPrisma,
  parseArgs,
  formatDate,
  hasHelp,
  exitWithError,
} from './_shared.js';

const USAGE = `
SavSpot Admin — Tenant Suspension Management

Usage:
  tsx scripts/admin/suspend-tenant.ts <command> [options]

Commands:
  suspend     Suspend a tenant (set status to SUSPENDED)
  unsuspend   Unsuspend a tenant (set status to ACTIVE)
  status      Show current tenant status with details

Options:
  --id <UUID>       Tenant ID (required)
  --reason <TEXT>   Reason for suspension (optional, used with suspend)
  --help            Show this help message

Examples:
  tsx scripts/admin/suspend-tenant.ts status --id abc123-def456
  tsx scripts/admin/suspend-tenant.ts suspend --id abc123-def456 --reason "Terms violation"
  tsx scripts/admin/suspend-tenant.ts unsuspend --id abc123-def456
`.trim();

async function showStatus(tenantId: string): Promise<void> {
  const prisma = getPrisma();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: {
          bookings: true,
          memberships: true,
          services: true,
          payments: true,
        },
      },
    },
  });

  if (!tenant) {
    exitWithError(`Tenant with ID "${tenantId}" not found.`);
  }

  console.log(`\nTenant Details:`);
  console.log(`  ID:              ${tenant.id}`);
  console.log(`  Name:            ${tenant.name}`);
  console.log(`  Slug:            ${tenant.slug}`);
  console.log(`  Category:        ${tenant.category}`);
  console.log(`  Status:          ${tenant.status}`);
  console.log(`  Subscription:    ${tenant.subscriptionTier}`);
  console.log(`  Published:       ${tenant.isPublished ? 'Yes' : 'No'}`);
  console.log(`  Timezone:        ${tenant.timezone}`);
  console.log(`  Currency:        ${tenant.currency}`);
  console.log(`  Country:         ${tenant.country}`);
  console.log(`  Contact Email:   ${tenant.contactEmail ?? 'N/A'}`);
  console.log(`  Contact Phone:   ${tenant.contactPhone ?? 'N/A'}`);
  console.log(`  Payment Provider: ${tenant.paymentProvider}`);
  console.log(`  Onboarded:       ${tenant.paymentProviderOnboarded ? 'Yes' : 'No'}`);
  console.log(`  Created At:      ${formatDate(tenant.createdAt)}`);
  console.log(`  Updated At:      ${formatDate(tenant.updatedAt)}`);
  console.log();
  console.log(`  Counts:`);
  console.log(`    Members:  ${tenant._count.memberships}`);
  console.log(`    Services: ${tenant._count.services}`);
  console.log(`    Bookings: ${tenant._count.bookings}`);
  console.log(`    Payments: ${tenant._count.payments}`);
  console.log();

  // Show recent audit log entries for this tenant
  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType: 'Tenant',
      action: { in: ['UPDATE'] },
    },
    orderBy: { timestamp: 'desc' },
    take: 5,
    select: {
      action: true,
      actorType: true,
      oldValues: true,
      newValues: true,
      metadata: true,
      timestamp: true,
    },
  });

  if (recentAuditLogs.length > 0) {
    console.log(`  Recent Audit Entries (Tenant entity):`);
    for (const log of recentAuditLogs) {
      const meta = log.metadata as Record<string, unknown> | null;
      const reason = meta?.['reason'] ?? '';
      console.log(
        `    [${formatDate(log.timestamp)}] ${log.action} by ${log.actorType}${reason ? ` — ${reason}` : ''}`,
      );
    }
    console.log();
  }
}

async function suspendTenant(tenantId: string, reason?: string): Promise<void> {
  const prisma = getPrisma();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!tenant) {
    exitWithError(`Tenant with ID "${tenantId}" not found.`);
  }

  if (tenant.status === 'SUSPENDED') {
    console.log(`\nTenant "${tenant.name}" (${tenant.slug}) is already SUSPENDED.\n`);
    return;
  }

  const previousStatus = tenant.status;

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'Tenant',
        entityId: tenantId,
        action: 'UPDATE',
        actorType: 'SYSTEM',
        oldValues: { status: previousStatus },
        newValues: { status: 'SUSPENDED' },
        metadata: {
          operation: 'suspend',
          reason: reason ?? 'Suspended via admin CLI',
          previousStatus,
        },
      },
    }),
  ]);

  console.log(`\nTenant suspended successfully:`);
  console.log(`  Name:            ${tenant.name}`);
  console.log(`  Slug:            ${tenant.slug}`);
  console.log(`  Previous Status: ${previousStatus}`);
  console.log(`  New Status:      SUSPENDED`);
  if (reason) {
    console.log(`  Reason:          ${reason}`);
  }
  console.log(`\nAn audit log entry has been created.\n`);
}

async function unsuspendTenant(tenantId: string): Promise<void> {
  const prisma = getPrisma();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!tenant) {
    exitWithError(`Tenant with ID "${tenantId}" not found.`);
  }

  if (tenant.status === 'ACTIVE') {
    console.log(`\nTenant "${tenant.name}" (${tenant.slug}) is already ACTIVE.\n`);
    return;
  }

  const previousStatus = tenant.status;

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'Tenant',
        entityId: tenantId,
        action: 'UPDATE',
        actorType: 'SYSTEM',
        oldValues: { status: previousStatus },
        newValues: { status: 'ACTIVE' },
        metadata: {
          operation: 'unsuspend',
          reason: 'Unsuspended via admin CLI',
          previousStatus,
        },
      },
    }),
  ]);

  console.log(`\nTenant unsuspended successfully:`);
  console.log(`  Name:            ${tenant.name}`);
  console.log(`  Slug:            ${tenant.slug}`);
  console.log(`  Previous Status: ${previousStatus}`);
  console.log(`  New Status:      ACTIVE`);
  console.log(`\nAn audit log entry has been created.\n`);
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
    exitWithError('Please specify a command: suspend, unsuspend, or status');
  }

  const tenantId = args.flags['id'];
  if (!tenantId) {
    exitWithError('--id is required. Provide the tenant UUID.');
  }

  switch (command) {
    case 'suspend': {
      const reason = args.flags['reason'];
      await suspendTenant(tenantId, reason);
      break;
    }

    case 'unsuspend': {
      await unsuspendTenant(tenantId);
      break;
    }

    case 'status': {
      await showStatus(tenantId);
      break;
    }

    default:
      exitWithError(`Unknown command "${command}". Use suspend, unsuspend, or status.`);
  }

  const prisma = getPrisma();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
