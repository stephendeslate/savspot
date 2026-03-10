// =============================================================================
// Seed Helpers — Shared constants, IDs, and utility functions
// =============================================================================

// ---------------------------------------------------------------------------
// Deterministic UUIDs for reproducible seeding
// ---------------------------------------------------------------------------

// Platform admin
export const PLATFORM_ADMIN_ID = '00000000-0000-4000-a000-000000000001';

// Tenant owners
export const OWNER_A_ID = '00000000-0000-4000-a000-000000000010';
export const OWNER_B_ID = '00000000-0000-4000-a000-000000000020';
export const OWNER_C_ID = '00000000-0000-4000-a000-000000000030';

// Staff members
export const STAFF_A1_ID = '00000000-0000-4000-a000-000000000011';
export const STAFF_B1_ID = '00000000-0000-4000-a000-000000000021';

// Client users
export const CLIENT_1_ID = '00000000-0000-4000-a000-000000000100';
export const CLIENT_2_ID = '00000000-0000-4000-a000-000000000101';
export const CLIENT_3_ID = '00000000-0000-4000-a000-000000000102';
export const CLIENT_4_ID = '00000000-0000-4000-a000-000000000103';
export const CLIENT_5_ID = '00000000-0000-4000-a000-000000000104';

// Tenants
export const TENANT_A_ID = '00000000-0000-4000-b000-000000000001';
export const TENANT_B_ID = '00000000-0000-4000-b000-000000000002';
export const TENANT_C_ID = '00000000-0000-4000-b000-000000000003';

// Tenant memberships
export const MEMBERSHIP_A_OWNER_ID = '00000000-0000-4000-8c00-000000000001';
export const MEMBERSHIP_A_STAFF_ID = '00000000-0000-4000-8c00-000000000002';
export const MEMBERSHIP_B_OWNER_ID = '00000000-0000-4000-8c00-000000000003';
export const MEMBERSHIP_B_STAFF_ID = '00000000-0000-4000-8c00-000000000004';
export const MEMBERSHIP_C_OWNER_ID = '00000000-0000-4000-8c00-000000000005';

// Services — Tenant A (Barbershop)
export const SERVICE_A_HAIRCUT_ID = '00000000-0000-4000-8d00-000000000001';
export const SERVICE_A_BEARD_ID = '00000000-0000-4000-8d00-000000000002';
export const SERVICE_A_GROOMING_ID = '00000000-0000-4000-8d00-000000000003';

// Services — Tenant B (Gym)
export const SERVICE_B_PT_ID = '00000000-0000-4000-8d00-000000000004';
export const SERVICE_B_GROUP_ID = '00000000-0000-4000-8d00-000000000005';

// Services — Tenant C (Venue)
export const SERVICE_C_RENTAL_ID = '00000000-0000-4000-8d00-000000000006';

// Bookings — Tenant A
export const BOOKING_A1_ID = '00000000-0000-4000-8e00-000000000001';
export const BOOKING_A2_ID = '00000000-0000-4000-8e00-000000000002';
export const BOOKING_A3_ID = '00000000-0000-4000-8e00-000000000003';
export const BOOKING_A4_ID = '00000000-0000-4000-8e00-000000000004';
export const BOOKING_A5_ID = '00000000-0000-4000-8e00-000000000005';

// Bookings — Tenant B
export const BOOKING_B1_ID = '00000000-0000-4000-8e00-000000000006';
export const BOOKING_B2_ID = '00000000-0000-4000-8e00-000000000007';
export const BOOKING_B3_ID = '00000000-0000-4000-8e00-000000000008';

// Bookings — Tenant C
export const BOOKING_C1_ID = '00000000-0000-4000-8e00-000000000009';
export const BOOKING_C2_ID = '00000000-0000-4000-8e00-000000000010';

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Generate a new random UUID (v4).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a Date relative to the current time.
 * Positive values are in the future, negative in the past.
 */
export function relativeDate(
  days: number,
  hours: number = 0,
  minutes: number = 0,
): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

/**
 * Create a specific time-of-day Date for a given offset in days.
 * Useful for booking start/end times.
 */
export function dateAtTime(
  daysOffset: number,
  hour: number,
  minute: number = 0,
): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Build a time-only Date for AvailabilityRule (db.Time fields).
 * Prisma stores @db.Time() as a Date with date portion set to epoch.
 */
export function timeOnly(hour: number, minute: number = 0): Date {
  return new Date(1970, 0, 1, hour, minute, 0, 0);
}

/**
 * Bcrypt hash for the seed password "Password123!".
 * Used by all seeded users so E2E and integration tests can log in.
 */
export const SEED_PASSWORD_HASH =
  '$2b$10$0cQ8ddXfR7RGKgxDiN/AWuTZmJfyxVim9oZ0yDBJvtlQrSNcyiUF.';
