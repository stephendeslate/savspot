/**
 * Shared test data constants for E2E tests.
 *
 * Values are read from environment variables where possible,
 * falling back to sensible defaults that match the dev seed data.
 */

/** Credentials used by the auth setup to log in. */
export const TEST_USER = {
  email: process.env['E2E_USER_EMAIL'] ?? 'marcus@smoothcuts.example.com',
  password: process.env['E2E_USER_PASSWORD'] ?? 'Password123!',
  name: 'Marcus Johnson',
} as const;

/** Tenant whose data the tests operate against. */
export const TEST_TENANT = {
  slug: process.env['E2E_TENANT_SLUG'] ?? 'smooth-cuts-barbershop',
  name: 'Smooth Cuts Barbershop',
} as const;

/** Service names expected to exist in the seeded database. */
export const EXPECTED_SERVICES = [
  'Haircut',
  'Beard Trim',
  'Full Grooming Package',
] as const;

/** Second tenant for cross-tenant tests. */
export const TEST_TENANT_B = {
  slug: 'peak-performance-gym',
  name: 'Peak Performance Gym',
} as const;

/** Third tenant for cross-tenant tests. */
export const TEST_TENANT_C = {
  slug: 'lakeside-event-center',
  name: 'Lakeside Event Center',
} as const;

/** Seeded client names for verification. */
export const EXPECTED_CLIENTS = [
  'Tony Stark',
  'Diana Prince',
  'Bruce Wayne',
  'Natasha Romanoff',
  'Peter Parker',
] as const;

/** All settings sections visible on /settings page. */
export const EXPECTED_SETTINGS_SECTIONS = [
  'Business Profile',
  'Availability',
  'Payments',
  'Calendar',
  'Notifications',
  'Branding',
  'Discounts',
  'Tax Rates',
  'Gallery',
  'Team',
  'Booking Flow',
  'Embed Widget',
  'Workflows',
  'Communications',
  'Venues',
  'Referrals',
  'Accounting',
  'Custom Domains',
  'Billing & Plans',
  'Service Categories',
  'API Keys',
  'Notification Preferences',
  'Voice & Telephony',
  'Partner Program',
] as const;
