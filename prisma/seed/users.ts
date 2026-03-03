// =============================================================================
// Seed: Users
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';
import {
  PLATFORM_ADMIN_ID,
  OWNER_A_ID,
  OWNER_B_ID,
  OWNER_C_ID,
  STAFF_A1_ID,
  STAFF_B1_ID,
  CLIENT_1_ID,
  CLIENT_2_ID,
  CLIENT_3_ID,
  CLIENT_4_ID,
  CLIENT_5_ID,
  SEED_PASSWORD_HASH,
} from './helpers.js';

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const users = [
    // ---- Platform Admin ----
    {
      id: PLATFORM_ADMIN_ID,
      email: 'admin@savspot.io',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Platform Admin',
      role: 'PLATFORM_ADMIN' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },

    // ---- Tenant Owners ----
    {
      id: OWNER_A_ID,
      email: 'marcus@smoothcuts.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Marcus Johnson',
      phone: '+12125551001',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
    {
      id: OWNER_B_ID,
      email: 'sarah@peakperformance.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Sarah Chen',
      phone: '+13105551002',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/Los_Angeles',
    },
    {
      id: OWNER_C_ID,
      email: 'james@lakesideevents.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'James Williams',
      phone: '+17735551003',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/Chicago',
    },

    // ---- Staff Members ----
    {
      id: STAFF_A1_ID,
      email: 'derek@smoothcuts.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Derek Brown',
      phone: '+12125551011',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
    {
      id: STAFF_B1_ID,
      email: 'alex@peakperformance.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Alex Rivera',
      phone: '+13105551021',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/Los_Angeles',
    },

    // ---- Client Users ----
    {
      id: CLIENT_1_ID,
      email: 'tony.stark@example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Tony Stark',
      phone: '+12125552001',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
    {
      id: CLIENT_2_ID,
      email: 'diana.prince@example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Diana Prince',
      phone: '+13105552002',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/Los_Angeles',
    },
    {
      id: CLIENT_3_ID,
      email: 'bruce.wayne@example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Bruce Wayne',
      phone: '+17735552003',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/Chicago',
    },
    {
      id: CLIENT_4_ID,
      email: 'natasha.romanoff@example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Natasha Romanoff',
      phone: '+12125552004',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
    {
      id: CLIENT_5_ID,
      email: 'peter.parker@example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Peter Parker',
      phone: '+12125552005',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  console.log(`  Created ${users.length} users`);
}
