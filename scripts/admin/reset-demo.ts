// =============================================================================
// SavSpot Platform Admin — Reset Demo Tenant
// Clears all demo tenant data and re-seeds it.
// Run with: npx tsx scripts/admin/reset-demo.ts
// =============================================================================

import { Prisma } from '../../prisma/generated/prisma/index.js';
import { getPrisma } from './_shared.js';
import { seedDemo } from '../../prisma/seed/demo.js';
import {
  DEMO_TENANT_ID,
  DEMO_OWNER_ID,
  DEMO_STAFF_1_ID,
  DEMO_STAFF_2_ID,
} from '../../prisma/seed/helpers.js';

const DEMO_USER_IDS = [DEMO_OWNER_ID, DEMO_STAFF_1_ID, DEMO_STAFF_2_ID];

// Prisma $executeRaw tagged templates pass interpolated values as text parameters.
// PostgreSQL cannot compare text = uuid directly, so we cast the parameter to uuid.
const tid = Prisma.sql`CAST(${DEMO_TENANT_ID} AS uuid)`;

async function clearDemoData(): Promise<void> {
  const prisma = getPrisma();

  console.log('Clearing demo tenant data...');

  // Layer 1: Leaf tables scoped to tenant
  await prisma.$executeRaw`DELETE FROM "booking_state_history" WHERE booking_id IN (SELECT id FROM "bookings" WHERE tenant_id = ${tid})`;
  await prisma.$executeRaw`DELETE FROM "booking_reminders" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "booking_flow_analytics" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "communications" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "notifications" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "audit_logs" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "notes" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "client_profiles" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "reviews" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "gallery_photos" WHERE tenant_id = ${tid}`;

  // Layer 2: Booking-related tables
  await prisma.$executeRaw`DELETE FROM "payments" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "invoices" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "bookings" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "date_reservations" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "booking_sessions" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "booking_flows" WHERE tenant_id = ${tid}`;

  // Layer 3: Service and availability tables
  await prisma.$executeRaw`DELETE FROM "service_addons" WHERE service_id IN (SELECT id FROM "services" WHERE tenant_id = ${tid})`;
  await prisma.$executeRaw`DELETE FROM "service_providers" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "availability_rules" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "blocked_dates" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "services" WHERE tenant_id = ${tid}`;

  // Layer 4: Membership and tenant
  await prisma.$executeRaw`DELETE FROM "team_invitations" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "tenant_memberships" WHERE tenant_id = ${tid}`;
  await prisma.$executeRaw`DELETE FROM "tenants" WHERE id = ${tid}`;

  // Layer 5: Demo users
  for (const userId of DEMO_USER_IDS) {
    const uid = Prisma.sql`CAST(${userId} AS uuid)`;
    await prisma.$executeRaw`DELETE FROM "users" WHERE id = ${uid}`;
  }

  console.log('  Demo data cleared.');
}

async function main(): Promise<void> {
  console.log('=== Reset Demo Tenant ===\n');

  await clearDemoData();

  console.log('\nRe-seeding demo tenant...\n');
  const prisma = getPrisma();
  await seedDemo(prisma);

  console.log('\n=== Demo reset complete! ===');
}

main()
  .catch((error) => {
    console.error('Demo reset failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });
