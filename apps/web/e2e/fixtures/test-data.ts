/**
 * Shared test data constants for E2E tests.
 *
 * Values are read from environment variables where possible,
 * falling back to sensible defaults that match the dev seed data.
 */

/** Credentials used by the auth setup to log in. */
export const TEST_USER = {
  email: process.env['E2E_USER_EMAIL'] ?? 'owner@demo.savspot.com',
  password: process.env['E2E_USER_PASSWORD'] ?? 'Password123!',
  name: 'Demo Owner',
} as const;

/** Tenant whose data the tests operate against. */
export const TEST_TENANT = {
  slug: process.env['E2E_TENANT_SLUG'] ?? 'demo-salon',
  name: 'Demo Salon',
} as const;

/** Service names expected to exist in the seeded database. */
export const EXPECTED_SERVICES = [
  'Haircut',
  'Hair Coloring',
  'Blowout',
] as const;
