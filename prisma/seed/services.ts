// =============================================================================
// Seed: Services
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';
import {
  TENANT_A_ID,
  TENANT_B_ID,
  TENANT_C_ID,
  SERVICE_A_HAIRCUT_ID,
  SERVICE_A_BEARD_ID,
  SERVICE_A_GROOMING_ID,
  SERVICE_B_PT_ID,
  SERVICE_B_GROUP_ID,
  SERVICE_C_RENTAL_ID,
} from './helpers.js';

export async function seedServices(prisma: PrismaClient): Promise<void> {
  const services = [
    // ---- Tenant A: Smooth Cuts Barbershop ----
    {
      id: SERVICE_A_HAIRCUT_ID,
      tenantId: TENANT_A_ID,
      name: 'Haircut',
      description: 'Classic men\'s haircut with hot towel finish.',
      durationMinutes: 30,
      basePrice: '30',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 1,
      confirmationMode: 'AUTO_CONFIRM' as const,
    },
    {
      id: SERVICE_A_BEARD_ID,
      tenantId: TENANT_A_ID,
      name: 'Beard Trim',
      description: 'Professional beard shaping and trim.',
      durationMinutes: 15,
      basePrice: '15',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 2,
      confirmationMode: 'AUTO_CONFIRM' as const,
    },
    {
      id: SERVICE_A_GROOMING_ID,
      tenantId: TENANT_A_ID,
      name: 'Full Grooming Package',
      description:
        'Complete grooming: haircut, beard trim, hot towel shave, and facial.',
      durationMinutes: 60,
      basePrice: '60',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 3,
      confirmationMode: 'AUTO_CONFIRM' as const,
      depositConfig: {
        required: true,
        type: 'PERCENTAGE',
        value: 50, // 50% deposit
      },
    },

    // ---- Tenant B: Peak Performance Gym ----
    {
      id: SERVICE_B_PT_ID,
      tenantId: TENANT_B_ID,
      name: 'Personal Training Session',
      description: 'One-on-one personal training with a certified trainer.',
      durationMinutes: 60,
      basePrice: '80',
      currency: 'USD',
      pricingModel: 'HOURLY' as const,
      pricingUnit: 'PER_HOUR' as const,
      isActive: true,
      sortOrder: 1,
      confirmationMode: 'AUTO_CONFIRM' as const,
      guestConfig: {
        enabled: true,
        maxGuests: 1,
        pricePerGuest: '40',
      },
    },
    {
      id: SERVICE_B_GROUP_ID,
      tenantId: TENANT_B_ID,
      name: 'Group Fitness Class',
      description:
        'High-energy group class — HIIT, yoga, spin, or bootcamp.',
      durationMinutes: 45,
      basePrice: '25',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 2,
      confirmationMode: 'AUTO_CONFIRM' as const,
      guestConfig: {
        enabled: true,
        maxGuests: 3,
        pricePerGuest: '20',
      },
    },

    // ---- Tenant C: Lakeside Event Center ----
    {
      id: SERVICE_C_RENTAL_ID,
      tenantId: TENANT_C_ID,
      name: 'Venue Rental',
      description:
        'Full venue rental — includes main hall, outdoor terrace, and prep kitchen.',
      durationMinutes: 240,
      basePrice: '500',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 1,
      confirmationMode: 'MANUAL_APPROVAL' as const,
      approvalDeadlineHours: 48,
      tierConfig: {
        tiers: [
          { name: 'Basic', guestRange: [1, 50], price: '500' },
          { name: 'Standard', guestRange: [51, 100], price: '750' },
          { name: 'Premium', guestRange: [101, 200], price: '1200' },
        ],
      },
      depositConfig: {
        required: true,
        type: 'PERCENTAGE',
        value: 25, // 25% deposit
      },
    },
  ];

  for (const service of services) {
    await prisma.service.create({ data: service });
  }

  console.log(`  Created ${services.length} services`);
}
