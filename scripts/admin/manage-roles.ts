#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Manage User Roles
// Usage: tsx scripts/admin/manage-roles.ts [grant|revoke|list] [--email user@example.com] [--role PLATFORM_ADMIN]
// =============================================================================

import { PlatformRole } from '../../prisma/generated/prisma/index.js';
import {
  getPrisma,
  parseArgs,
  formatTable,
  formatDate,
  hasHelp,
  exitWithError,
} from './_shared.js';

const USAGE = `
SavSpot Admin — Manage User Roles

Usage:
  tsx scripts/admin/manage-roles.ts <command> [options]

Commands:
  list    List all users with PLATFORM_ADMIN role
  grant   Grant a role to a user
  revoke  Revoke PLATFORM_ADMIN role (set to USER)

Options:
  --email <EMAIL>   User email address (required for grant/revoke)
  --role <ROLE>     Role to grant: PLATFORM_ADMIN (default: PLATFORM_ADMIN)
  --help            Show this help message

Examples:
  tsx scripts/admin/manage-roles.ts list
  tsx scripts/admin/manage-roles.ts grant --email admin@example.com
  tsx scripts/admin/manage-roles.ts grant --email admin@example.com --role PLATFORM_ADMIN
  tsx scripts/admin/manage-roles.ts revoke --email admin@example.com
`.trim();

const VALID_ROLES: PlatformRole[] = ['PLATFORM_ADMIN', 'USER'];

async function listAdmins(): Promise<void> {
  const prisma = getPrisma();

  const admins = await prisma.user.findMany({
    where: { role: 'PLATFORM_ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: { memberships: true },
      },
    },
  });

  if (admins.length === 0) {
    console.log('\nNo users with PLATFORM_ADMIN role found.\n');
    return;
  }

  const headers = ['ID', 'Email', 'Name', 'Role', 'Verified', 'Tenants', 'Created At'];

  const rows = admins.map((u) => [
    u.id.slice(0, 12),
    u.email,
    u.name,
    u.role,
    u.emailVerified ? 'Yes' : 'No',
    String(u._count.memberships),
    formatDate(u.createdAt),
  ]);

  console.log(`\nPlatform Admins (${admins.length}):\n`);
  console.log(formatTable(headers, rows));
  console.log();
}

async function grantRole(email: string, role: PlatformRole): Promise<void> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    exitWithError(`User with email "${email}" not found.`);
  }

  if (user.role === role) {
    console.log(`\nUser "${user.name}" (${user.email}) already has role ${role}. No change needed.\n`);
    return;
  }

  const previousRole = user.role;

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  console.log(`\nRole granted successfully:`);
  console.log(`  User: ${user.name} (${user.email})`);
  console.log(`  Previous Role: ${previousRole}`);
  console.log(`  New Role: ${role}`);
  console.log();
}

async function revokeRole(email: string): Promise<void> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    exitWithError(`User with email "${email}" not found.`);
  }

  if (user.role === 'USER') {
    console.log(`\nUser "${user.name}" (${user.email}) already has role USER. No change needed.\n`);
    return;
  }

  const previousRole = user.role;

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'USER' },
  });

  console.log(`\nRole revoked successfully:`);
  console.log(`  User: ${user.name} (${user.email})`);
  console.log(`  Previous Role: ${previousRole}`);
  console.log(`  New Role: USER`);
  console.log();
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
    exitWithError('Please specify a command: list, grant, or revoke');
  }

  switch (command) {
    case 'list': {
      await listAdmins();
      break;
    }

    case 'grant': {
      const email = args.flags['email'];
      if (!email) {
        exitWithError('--email is required for grant command');
      }

      const role = (args.flags['role']?.toUpperCase() ?? 'PLATFORM_ADMIN') as PlatformRole;
      if (!VALID_ROLES.includes(role)) {
        exitWithError(
          `Invalid role "${args.flags['role']}". Must be one of: ${VALID_ROLES.join(', ')}`,
        );
      }

      await grantRole(email, role);
      break;
    }

    case 'revoke': {
      const email = args.flags['email'];
      if (!email) {
        exitWithError('--email is required for revoke command');
      }
      await revokeRole(email);
      break;
    }

    default:
      exitWithError(`Unknown command "${command}". Use list, grant, or revoke.`);
  }

  const prisma = getPrisma();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
