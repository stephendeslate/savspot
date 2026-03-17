// =============================================================================
// SavSpot Platform Admin — Reset Demo Tenant
// Clears all demo tenant data and re-seeds it.
// Run with: pnpm admin:reset-demo
// =============================================================================

import { getPrisma } from './_shared.js';
import { seedDemo } from '../../prisma/seed/demo.js';
import {
  DEMO_TENANT_ID,
  DEMO_OWNER_ID,
  DEMO_STAFF_1_ID,
  DEMO_STAFF_2_ID,
} from '../../prisma/seed/helpers.js';

const DEMO_USER_IDS = [DEMO_OWNER_ID, DEMO_STAFF_1_ID, DEMO_STAFF_2_ID];

// Prisma $executeRawUnsafe sends params as text type, which PostgreSQL refuses
// to compare against uuid columns even with ::uuid casts. Since these are
// hardcoded constants (no injection risk), we inline them directly.

async function deleteTenant(table: string, col = 'tenant_id'): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(
    `DELETE FROM "${table}" WHERE "${col}" = '${DEMO_TENANT_ID}'::uuid`,
  );
}

async function clearDemoData(): Promise<void> {
  const prisma = getPrisma();

  console.log('Clearing demo tenant data...');

  // Layer 1: Leaf tables scoped to tenant
  await prisma.$executeRawUnsafe(
    `DELETE FROM "booking_state_history" WHERE booking_id IN (SELECT id FROM "bookings" WHERE tenant_id = '${DEMO_TENANT_ID}'::uuid)`,
  );
  await deleteTenant('booking_reminders');
  await deleteTenant('booking_flow_analytics');
  await deleteTenant('communications');
  await deleteTenant('notifications');
  await deleteTenant('audit_logs');
  await deleteTenant('notes');
  await deleteTenant('client_profiles');
  await deleteTenant('reviews');
  await deleteTenant('gallery_photos');

  // Layer 2: Booking-related tables
  await deleteTenant('payments');
  await deleteTenant('invoices');
  await deleteTenant('bookings');
  await deleteTenant('date_reservations');
  await deleteTenant('booking_sessions');
  await deleteTenant('booking_flows');

  // Layer 3: Service and availability tables
  await prisma.$executeRawUnsafe(
    `DELETE FROM "service_addons" WHERE service_id IN (SELECT id FROM "services" WHERE tenant_id = '${DEMO_TENANT_ID}'::uuid)`,
  );
  await deleteTenant('service_providers');
  await deleteTenant('availability_rules');
  await deleteTenant('blocked_dates');
  await deleteTenant('services');

  // Layer 4: Membership and tenant
  await deleteTenant('team_invitations');
  await deleteTenant('tenant_memberships');
  await deleteTenant('tenants', 'id');

  // Layer 5: Demo users
  for (const userId of DEMO_USER_IDS) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "users" WHERE id = '${userId}'::uuid`,
    );
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
