// =============================================================================
// Seed: Availability Rules
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';
import {
  TENANT_A_ID,
  TENANT_B_ID,
  TENANT_C_ID,
  generateId,
  timeOnly,
} from './helpers.js';

/**
 * dayOfWeek mapping (ISO: 1=Monday ... 7=Sunday)
 */
const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;
const FRIDAY = 5;
const SATURDAY = 6;
const SUNDAY = 7;

export async function seedAvailabilityRules(
  prisma: PrismaClient,
): Promise<void> {
  const rules: Array<{
    id: string;
    tenantId: string;
    dayOfWeek: number;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
  }> = [];

  // ---- Tenant A: Smooth Cuts Barbershop — Mon-Sat 9:00-18:00 ----
  for (const day of [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY]) {
    rules.push({
      id: generateId(),
      tenantId: TENANT_A_ID,
      dayOfWeek: day,
      startTime: timeOnly(9, 0),
      endTime: timeOnly(18, 0),
      isActive: true,
    });
  }

  // ---- Tenant B: Peak Performance Gym — Mon-Fri 6:00-21:00 ----
  for (const day of [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY]) {
    rules.push({
      id: generateId(),
      tenantId: TENANT_B_ID,
      dayOfWeek: day,
      startTime: timeOnly(6, 0),
      endTime: timeOnly(21, 0),
      isActive: true,
    });
  }

  // ---- Tenant C: Lakeside Event Center — Fri-Sun 10:00-22:00 ----
  for (const day of [FRIDAY, SATURDAY, SUNDAY]) {
    rules.push({
      id: generateId(),
      tenantId: TENANT_C_ID,
      dayOfWeek: day,
      startTime: timeOnly(10, 0),
      endTime: timeOnly(22, 0),
      isActive: true,
    });
  }

  for (const rule of rules) {
    await prisma.availabilityRule.create({ data: rule });
  }

  console.log(`  Created ${rules.length} availability rules`);
}
