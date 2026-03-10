// =============================================================================
// Seed Orchestrator
// Clears all tables (respecting FK constraints) then seeds in dependency order.
// Run with: npx tsx prisma/seed/index.ts
// =============================================================================

import { PrismaClient } from '../generated/prisma/index.js';
import { seedUsers } from './users.js';
import { seedTenants } from './tenants.js';
import { seedServices } from './services.js';
import { seedAvailabilityRules } from './availability.js';
import { seedBookings } from './bookings.js';
import { seedNotificationTypes } from './notification-types.js';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Clear all tables in reverse-dependency order (children before parents).
// This avoids FK constraint violations during deletion.
// ---------------------------------------------------------------------------
async function clearDatabase(): Promise<void> {
  console.log('Clearing database...');

  // Layer 1: Deepest leaf tables (no children depend on them)
  await prisma.$executeRawUnsafe('DELETE FROM "import_records"');
  await prisma.$executeRawUnsafe('DELETE FROM "breach_notifications"');
  await prisma.$executeRawUnsafe('DELETE FROM "affected_users"');
  await prisma.$executeRawUnsafe('DELETE FROM "review_photos"');
  await prisma.$executeRawUnsafe('DELETE FROM "message_read_status"');
  await prisma.$executeRawUnsafe('DELETE FROM "message_attachments"');
  await prisma.$executeRawUnsafe('DELETE FROM "invoice_line_items"');
  await prisma.$executeRawUnsafe('DELETE FROM "webhook_dead_letters"');
  await prisma.$executeRawUnsafe('DELETE FROM "payment_state_history"');
  await prisma.$executeRawUnsafe('DELETE FROM "payment_disputes"');
  await prisma.$executeRawUnsafe('DELETE FROM "booking_state_history"');
  await prisma.$executeRawUnsafe('DELETE FROM "contract_signatures"');
  await prisma.$executeRawUnsafe('DELETE FROM "contract_amendments"');
  await prisma.$executeRawUnsafe('DELETE FROM "quote_option_items"');
  await prisma.$executeRawUnsafe('DELETE FROM "quote_line_items"');
  await prisma.$executeRawUnsafe('DELETE FROM "workflow_stages"');
  await prisma.$executeRawUnsafe('DELETE FROM "booking_workflow_overrides"');
  await prisma.$executeRawUnsafe('DELETE FROM "template_history"');
  await prisma.$executeRawUnsafe('DELETE FROM "booking_flow_analytics"');
  await prisma.$executeRawUnsafe('DELETE FROM "browser_push_subscriptions"');

  // Layer 2: Tables that only have layer-1 children
  await prisma.$executeRawUnsafe('DELETE FROM "import_records"');
  await prisma.$executeRawUnsafe('DELETE FROM "import_jobs"');
  await prisma.$executeRawUnsafe('DELETE FROM "accounting_connections"');
  await prisma.$executeRawUnsafe('DELETE FROM "feedback"');
  await prisma.$executeRawUnsafe('DELETE FROM "support_tickets"');
  await prisma.$executeRawUnsafe('DELETE FROM "referral_links"');
  await prisma.$executeRawUnsafe('DELETE FROM "notes"');
  await prisma.$executeRawUnsafe('DELETE FROM "api_keys"');
  await prisma.$executeRawUnsafe('DELETE FROM "reviews"');
  await prisma.$executeRawUnsafe('DELETE FROM "consent_records"');
  await prisma.$executeRawUnsafe('DELETE FROM "data_requests"');
  await prisma.$executeRawUnsafe('DELETE FROM "security_breaches"');
  await prisma.$executeRawUnsafe('DELETE FROM "audit_logs"');
  await prisma.$executeRawUnsafe('DELETE FROM "onboarding_tours"');
  await prisma.$executeRawUnsafe('DELETE FROM "gallery_photos"');
  await prisma.$executeRawUnsafe('DELETE FROM "client_profiles"');
  await prisma.$executeRawUnsafe('DELETE FROM "messages"');
  await prisma.$executeRawUnsafe('DELETE FROM "message_threads"');
  await prisma.$executeRawUnsafe('DELETE FROM "calendar_events"');
  await prisma.$executeRawUnsafe('DELETE FROM "calendar_connections"');
  await prisma.$executeRawUnsafe('DELETE FROM "booking_reminders"');
  await prisma.$executeRawUnsafe('DELETE FROM "workflow_webhooks"');
  await prisma.$executeRawUnsafe('DELETE FROM "workflow_templates"');
  await prisma.$executeRawUnsafe('DELETE FROM "workflow_automations"');
  await prisma.$executeRawUnsafe('DELETE FROM "quote_options"');
  await prisma.$executeRawUnsafe('DELETE FROM "quotes"');
  await prisma.$executeRawUnsafe('DELETE FROM "contracts"');
  await prisma.$executeRawUnsafe('DELETE FROM "contract_templates"');
  await prisma.$executeRawUnsafe('DELETE FROM "notification_digests"');
  await prisma.$executeRawUnsafe('DELETE FROM "device_push_tokens"');
  await prisma.$executeRawUnsafe('DELETE FROM "notification_preferences"');
  await prisma.$executeRawUnsafe('DELETE FROM "notifications"');
  await prisma.$executeRawUnsafe('DELETE FROM "notification_types"');
  await prisma.$executeRawUnsafe('DELETE FROM "communication_templates"');
  await prisma.$executeRawUnsafe('DELETE FROM "email_layouts"');
  await prisma.$executeRawUnsafe('DELETE FROM "communications"');
  await prisma.$executeRawUnsafe('DELETE FROM "discounts"');
  await prisma.$executeRawUnsafe('DELETE FROM "tax_rates"');
  await prisma.$executeRawUnsafe('DELETE FROM "service_addons"');
  await prisma.$executeRawUnsafe('DELETE FROM "service_providers"');
  await prisma.$executeRawUnsafe('DELETE FROM "payment_webhook_logs"');

  // Layer 3: Core booking/payment/service tables
  await prisma.$executeRawUnsafe('DELETE FROM "payments"');
  await prisma.$executeRawUnsafe('DELETE FROM "invoices"');
  await prisma.$executeRawUnsafe('DELETE FROM "bookings"');
  await prisma.$executeRawUnsafe('DELETE FROM "date_reservations"');
  await prisma.$executeRawUnsafe('DELETE FROM "booking_sessions"');
  await prisma.$executeRawUnsafe('DELETE FROM "booking_flows"');
  await prisma.$executeRawUnsafe('DELETE FROM "availability_rules"');
  await prisma.$executeRawUnsafe('DELETE FROM "blocked_dates"');
  await prisma.$executeRawUnsafe('DELETE FROM "services"');
  await prisma.$executeRawUnsafe('DELETE FROM "service_categories"');
  await prisma.$executeRawUnsafe('DELETE FROM "venues"');

  // Layer 4: Tenant membership and invitations
  await prisma.$executeRawUnsafe('DELETE FROM "team_invitations"');
  await prisma.$executeRawUnsafe('DELETE FROM "tenant_memberships"');

  // Layer 5: Root tables
  await prisma.$executeRawUnsafe('DELETE FROM "tenants"');
  await prisma.$executeRawUnsafe('DELETE FROM "users"');

  console.log('  All tables cleared.\n');
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('=== SavSpot Database Seed ===\n');

  await clearDatabase();

  console.log('Seeding data...\n');

  // 1. Users (no FK dependencies)
  console.log('[1/7] Users');
  await seedUsers(prisma);

  // 2. Tenants + Tenant Memberships (depends on users)
  console.log('[2/7] Tenants & Memberships');
  await seedTenants(prisma);

  // 3. Services (depends on tenants)
  console.log('[3/7] Services');
  await seedServices(prisma);

  // 4. Availability Rules (depends on tenants)
  console.log('[4/7] Availability Rules');
  await seedAvailabilityRules(prisma);

  // 5. Bookings (depends on tenants, users, services)
  console.log('[5/7] Bookings');
  await seedBookings(prisma);

  // 6. Notification Types (no FK dependencies)
  console.log('[6/7] Notification Types');
  await seedNotificationTypes(prisma);

  console.log('\n=== Seed complete! ===');
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------
main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
