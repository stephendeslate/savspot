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
