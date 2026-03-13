// =============================================================================
// Seed: Tenants & Tenant Memberships
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';
import {
  TENANT_A_ID,
  TENANT_B_ID,
  TENANT_C_ID,
  OWNER_A_ID,
  OWNER_B_ID,
  OWNER_C_ID,
  STAFF_A1_ID,
  STAFF_B1_ID,
  MEMBERSHIP_A_OWNER_ID,
  MEMBERSHIP_A_STAFF_ID,
  MEMBERSHIP_B_OWNER_ID,
  MEMBERSHIP_B_STAFF_ID,
  MEMBERSHIP_C_OWNER_ID,
} from './helpers.js';

export async function seedTenants(prisma: PrismaClient): Promise<void> {
  // ---------- Tenants ----------

  const tenants = [
    {
      id: TENANT_A_ID,
      name: 'Smooth Cuts Barbershop',
      slug: 'smooth-cuts-barbershop',
      description: 'Premium barbershop experience in downtown Manhattan.',
      category: 'SALON' as const,
      timezone: 'America/New_York',
      currency: 'USD',
      country: 'US',
      contactEmail: 'info@smoothcuts.example.com',
      contactPhone: '+12125551000',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      brandColor: '#1a1a2e',
      isPublished: true,
      subscriptionTier: 'FREE' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: TENANT_B_ID,
      name: 'Peak Performance Gym',
      slug: 'peak-performance-gym',
      description:
        'Elite personal training and group fitness classes in Los Angeles.',
      category: 'FITNESS' as const,
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      country: 'US',
      contactEmail: 'info@peakperformance.example.com',
      contactPhone: '+13105551000',
      address: {
        street: '456 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90028',
        country: 'US',
      },
      brandColor: '#e94560',
      isPublished: true,
      subscriptionTier: 'FREE' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: TENANT_C_ID,
      name: 'Lakeside Event Center',
      slug: 'lakeside-event-center',
      description:
        'Beautiful lakeside venue for weddings, corporate events, and celebrations.',
      category: 'VENUE' as const,
      timezone: 'America/Chicago',
      currency: 'USD',
      country: 'US',
      contactEmail: 'info@lakesideevents.example.com',
      contactPhone: '+17735551000',
      address: {
        street: '789 Lakeshore Dr',
        city: 'Chicago',
        state: 'IL',
        zip: '60611',
        country: 'US',
      },
      brandColor: '#0f3460',
      isPublished: true,
      subscriptionTier: 'PRO' as const,
      status: 'ACTIVE' as const,
    },
  ];

  for (const tenant of tenants) {
    await prisma.tenant.create({ data: tenant });
  }

  console.log(`  Created ${tenants.length} tenants`);

  // ---------- Tenant Memberships ----------

  const memberships = [
    // Tenant A — owner + staff
    {
      id: MEMBERSHIP_A_OWNER_ID,
      tenantId: TENANT_A_ID,
      userId: OWNER_A_ID,
      role: 'OWNER' as const,
    },
    {
      id: MEMBERSHIP_A_STAFF_ID,
      tenantId: TENANT_A_ID,
      userId: STAFF_A1_ID,
      role: 'STAFF' as const,
    },

    // Tenant B — owner + staff
    {
      id: MEMBERSHIP_B_OWNER_ID,
      tenantId: TENANT_B_ID,
      userId: OWNER_B_ID,
      role: 'OWNER' as const,
    },
    {
      id: MEMBERSHIP_B_STAFF_ID,
      tenantId: TENANT_B_ID,
      userId: STAFF_B1_ID,
      role: 'STAFF' as const,
    },

    // Tenant C — owner only
    {
      id: MEMBERSHIP_C_OWNER_ID,
      tenantId: TENANT_C_ID,
      userId: OWNER_C_ID,
      role: 'OWNER' as const,
    },
  ];

  for (const membership of memberships) {
    await prisma.tenantMembership.create({ data: membership });
  }

  console.log(`  Created ${memberships.length} tenant memberships`);
}
