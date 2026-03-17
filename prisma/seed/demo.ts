// =============================================================================
// Seed: Demo Barbershop Tenant
// Creates a complete demo tenant for the live demo at /book/demo-barbershop.
// All operations use upsert keyed on deterministic IDs for idempotency.
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';
import {
  DEMO_TENANT_ID,
  DEMO_OWNER_ID,
  DEMO_STAFF_1_ID,
  DEMO_STAFF_2_ID,
  DEMO_MEMBERSHIP_OWNER_ID,
  DEMO_MEMBERSHIP_STAFF_1_ID,
  DEMO_MEMBERSHIP_STAFF_2_ID,
  DEMO_SERVICE_HAIRCUT_ID,
  DEMO_SERVICE_BEARD_ID,
  DEMO_SERVICE_SHAVE_ID,
  DEMO_SERVICE_PACKAGE_ID,
  DEMO_BOOKING_1_ID,
  DEMO_BOOKING_2_ID,
  DEMO_BOOKING_3_ID,
  SEED_PASSWORD_HASH,
  generateId,
  timeOnly,
  dateAtTime,
} from './helpers.js';

export async function seedDemo(prisma: PrismaClient): Promise<void> {
  // ---- Users ----
  const users = [
    {
      id: DEMO_OWNER_ID,
      email: 'alex@demo-barbershop.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Alex Demo',
      phone: '+15551234000',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
    {
      id: DEMO_STAFF_1_ID,
      email: 'jordan@demo-barbershop.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Jordan Lee',
      phone: '+15551234001',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
    {
      id: DEMO_STAFF_2_ID,
      email: 'casey@demo-barbershop.example.com',
      passwordHash: SEED_PASSWORD_HASH,
      name: 'Casey Rivers',
      phone: '+15551234002',
      role: 'USER' as const,
      emailVerified: true,
      timezone: 'America/New_York',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  // ---- Tenant ----
  const tenant = {
    id: DEMO_TENANT_ID,
    name: 'Demo Barbershop',
    slug: 'demo-barbershop',
    description:
      'A sample barbershop to explore the SavSpot booking experience. Try booking a service!',
    category: 'SALON' as const,
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'US',
    contactEmail: 'demo@savspot.co',
    contactPhone: '+15551230000',
    address: {
      street: '100 Demo Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    brandColor: '#2563eb',
    isPublished: true,
    subscriptionTier: 'FREE' as const,
    status: 'ACTIVE' as const,
  };

  await prisma.tenant.upsert({
    where: { id: tenant.id },
    update: tenant,
    create: tenant,
  });

  // ---- Memberships ----
  const memberships = [
    {
      id: DEMO_MEMBERSHIP_OWNER_ID,
      tenantId: DEMO_TENANT_ID,
      userId: DEMO_OWNER_ID,
      role: 'OWNER' as const,
    },
    {
      id: DEMO_MEMBERSHIP_STAFF_1_ID,
      tenantId: DEMO_TENANT_ID,
      userId: DEMO_STAFF_1_ID,
      role: 'STAFF' as const,
    },
    {
      id: DEMO_MEMBERSHIP_STAFF_2_ID,
      tenantId: DEMO_TENANT_ID,
      userId: DEMO_STAFF_2_ID,
      role: 'STAFF' as const,
    },
  ];

  for (const m of memberships) {
    await prisma.tenantMembership.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }

  // ---- Services ----
  const services = [
    {
      id: DEMO_SERVICE_HAIRCUT_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'Classic Haircut',
      description: 'A sharp, clean haircut tailored to your style.',
      durationMinutes: 30,
      basePrice: '30',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 1,
      confirmationMode: 'AUTO_CONFIRM' as const,
    },
    {
      id: DEMO_SERVICE_BEARD_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'Beard Trim',
      description: 'Professional beard shaping, lining, and trim.',
      durationMinutes: 20,
      basePrice: '20',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 2,
      confirmationMode: 'AUTO_CONFIRM' as const,
    },
    {
      id: DEMO_SERVICE_SHAVE_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'Hot Towel Shave',
      description: 'Luxurious straight-razor shave with hot towel treatment.',
      durationMinutes: 25,
      basePrice: '25',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 3,
      confirmationMode: 'AUTO_CONFIRM' as const,
    },
    {
      id: DEMO_SERVICE_PACKAGE_ID,
      tenantId: DEMO_TENANT_ID,
      name: 'The Full Package',
      description:
        'Haircut, beard trim, and hot towel shave — the complete experience.',
      durationMinutes: 75,
      basePrice: '65',
      currency: 'USD',
      pricingModel: 'FIXED' as const,
      isActive: true,
      sortOrder: 4,
      confirmationMode: 'AUTO_CONFIRM' as const,
      depositConfig: {
        required: true,
        type: 'PERCENTAGE',
        value: 50,
      },
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: service,
      create: service,
    });
  }

  // ---- Availability: Mon-Sat 9:00-18:00 ----
  const MONDAY = 1;
  const SATURDAY = 6;

  for (let day = MONDAY; day <= SATURDAY; day++) {
    const ruleData = {
      tenantId: DEMO_TENANT_ID,
      dayOfWeek: day,
      startTime: timeOnly(9, 0),
      endTime: timeOnly(18, 0),
      isActive: true,
    };

    // Check for existing rule to avoid duplicates
    const existing = await prisma.availabilityRule.findFirst({
      where: { tenantId: DEMO_TENANT_ID, dayOfWeek: day },
    });

    if (existing) {
      await prisma.availabilityRule.update({
        where: { id: existing.id },
        data: ruleData,
      });
    } else {
      await prisma.availabilityRule.create({
        data: { id: generateId(), ...ruleData },
      });
    }
  }

  // ---- Bookings ----
  const bookings = [
    // CONFIRMED — future (2 days from now at 10:00)
    {
      id: DEMO_BOOKING_1_ID,
      tenantId: DEMO_TENANT_ID,
      clientId: DEMO_STAFF_1_ID, // staff acting as client for demo
      serviceId: DEMO_SERVICE_HAIRCUT_ID,
      status: 'CONFIRMED' as const,
      startTime: dateAtTime(2, 10, 0),
      endTime: dateAtTime(2, 10, 30),
      totalAmount: '30',
      currency: 'USD',
      source: 'DIRECT' as const,
    },
    // COMPLETED — past (3 days ago at 14:00)
    {
      id: DEMO_BOOKING_2_ID,
      tenantId: DEMO_TENANT_ID,
      clientId: DEMO_STAFF_2_ID,
      serviceId: DEMO_SERVICE_PACKAGE_ID,
      status: 'COMPLETED' as const,
      startTime: dateAtTime(-3, 14, 0),
      endTime: dateAtTime(-3, 15, 15),
      totalAmount: '65',
      currency: 'USD',
      source: 'DIRECT' as const,
    },
    // PENDING — future (4 days from now at 11:00)
    {
      id: DEMO_BOOKING_3_ID,
      tenantId: DEMO_TENANT_ID,
      clientId: DEMO_OWNER_ID,
      serviceId: DEMO_SERVICE_BEARD_ID,
      status: 'PENDING' as const,
      startTime: dateAtTime(4, 11, 0),
      endTime: dateAtTime(4, 11, 20),
      totalAmount: '20',
      currency: 'USD',
      source: 'DIRECT' as const,
    },
  ];

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      update: booking,
      create: booking,
    });
  }

  console.log('  Created demo tenant: Demo Barbershop (demo-barbershop)');
  console.log('    3 users, 4 services, 6 availability rules, 3 bookings');
}
