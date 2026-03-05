// =============================================================================
// Seed: Bookings
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';
import {
  TENANT_A_ID,
  TENANT_B_ID,
  TENANT_C_ID,
  CLIENT_1_ID,
  CLIENT_2_ID,
  CLIENT_3_ID,
  CLIENT_4_ID,
  CLIENT_5_ID,
  SERVICE_A_HAIRCUT_ID,
  SERVICE_A_BEARD_ID,
  SERVICE_A_GROOMING_ID,
  SERVICE_B_PT_ID,
  SERVICE_B_GROUP_ID,
  SERVICE_C_RENTAL_ID,
  BOOKING_A1_ID,
  BOOKING_A2_ID,
  BOOKING_A3_ID,
  BOOKING_A4_ID,
  BOOKING_A5_ID,
  BOOKING_B1_ID,
  BOOKING_B2_ID,
  BOOKING_B3_ID,
  BOOKING_C1_ID,
  BOOKING_C2_ID,
  dateAtTime,
} from './helpers.js';

export async function seedBookings(prisma: PrismaClient): Promise<void> {
  const bookings = [
    // ======================================================================
    // Tenant A: Smooth Cuts Barbershop — 5 bookings
    // ======================================================================

    // A1: CONFIRMED — Haircut tomorrow at 10:00
    {
      id: BOOKING_A1_ID,
      tenantId: TENANT_A_ID,
      clientId: CLIENT_1_ID,
      serviceId: SERVICE_A_HAIRCUT_ID,
      status: 'CONFIRMED' as const,
      startTime: dateAtTime(1, 10, 0),
      endTime: dateAtTime(1, 10, 30),
      totalAmount: '30',
      currency: 'USD',
      source: 'DIRECT' as const,
    },

    // A2: CONFIRMED — Beard Trim tomorrow at 11:00
    {
      id: BOOKING_A2_ID,
      tenantId: TENANT_A_ID,
      clientId: CLIENT_2_ID,
      serviceId: SERVICE_A_BEARD_ID,
      status: 'CONFIRMED' as const,
      startTime: dateAtTime(1, 11, 0),
      endTime: dateAtTime(1, 11, 15),
      totalAmount: '15',
      currency: 'USD',
      source: 'DIRECT' as const,
    },

    // A3: COMPLETED — Haircut yesterday at 14:00
    {
      id: BOOKING_A3_ID,
      tenantId: TENANT_A_ID,
      clientId: CLIENT_3_ID,
      serviceId: SERVICE_A_HAIRCUT_ID,
      status: 'COMPLETED' as const,
      startTime: dateAtTime(-1, 14, 0),
      endTime: dateAtTime(-1, 14, 30),
      totalAmount: '30',
      currency: 'USD',
      source: 'DIRECT' as const,
    },

    // A4: CANCELLED — Full Grooming 3 days ago (cancelled by client)
    {
      id: BOOKING_A4_ID,
      tenantId: TENANT_A_ID,
      clientId: CLIENT_4_ID,
      serviceId: SERVICE_A_GROOMING_ID,
      status: 'CANCELLED' as const,
      startTime: dateAtTime(-3, 9, 0),
      endTime: dateAtTime(-3, 10, 0),
      totalAmount: '60',
      currency: 'USD',
      source: 'DIRECT' as const,
      cancellationReason: 'CLIENT_REQUEST' as const,
      cancelledAt: dateAtTime(-4, 16, 0),
    },

    // A5: PENDING — Haircut in 3 days at 15:00
    {
      id: BOOKING_A5_ID,
      tenantId: TENANT_A_ID,
      clientId: CLIENT_5_ID,
      serviceId: SERVICE_A_HAIRCUT_ID,
      status: 'PENDING' as const,
      startTime: dateAtTime(3, 15, 0),
      endTime: dateAtTime(3, 15, 30),
      totalAmount: '30',
      currency: 'USD',
      source: 'DIRECT' as const,
    },

    // ======================================================================
    // Tenant B: Peak Performance Gym — 3 bookings
    // ======================================================================

    // B1: CONFIRMED — Personal Training tomorrow at 8:00
    {
      id: BOOKING_B1_ID,
      tenantId: TENANT_B_ID,
      clientId: CLIENT_1_ID,
      serviceId: SERVICE_B_PT_ID,
      status: 'CONFIRMED' as const,
      startTime: dateAtTime(1, 8, 0),
      endTime: dateAtTime(1, 9, 0),
      totalAmount: '80',
      currency: 'USD',
      source: 'DIRECT' as const,
    },

    // B2: COMPLETED — Group Class 2 days ago at 18:00
    {
      id: BOOKING_B2_ID,
      tenantId: TENANT_B_ID,
      clientId: CLIENT_2_ID,
      serviceId: SERVICE_B_GROUP_ID,
      status: 'COMPLETED' as const,
      startTime: dateAtTime(-2, 18, 0),
      endTime: dateAtTime(-2, 18, 45),
      totalAmount: '25',
      currency: 'USD',
      source: 'DIRECT' as const,
      guestCount: 1,
    },

    // B3: NO_SHOW — Personal Training yesterday at 7:00
    {
      id: BOOKING_B3_ID,
      tenantId: TENANT_B_ID,
      clientId: CLIENT_3_ID,
      serviceId: SERVICE_B_PT_ID,
      status: 'NO_SHOW' as const,
      startTime: dateAtTime(-1, 7, 0),
      endTime: dateAtTime(-1, 8, 0),
      totalAmount: '80',
      currency: 'USD',
      source: 'DIRECT' as const,
      checkInStatus: 'NO_SHOW' as const,
    },

    // ======================================================================
    // Tenant C: Lakeside Event Center — 2 bookings
    // ======================================================================

    // C1: CONFIRMED — Venue Rental in 14 days at 10:00
    {
      id: BOOKING_C1_ID,
      tenantId: TENANT_C_ID,
      clientId: CLIENT_4_ID,
      serviceId: SERVICE_C_RENTAL_ID,
      status: 'CONFIRMED' as const,
      startTime: dateAtTime(14, 10, 0),
      endTime: dateAtTime(14, 14, 0),
      totalAmount: '500',
      currency: 'USD',
      source: 'DIRECT' as const,
      guestCount: 80,
      notes: 'Corporate team-building event. Catering to be arranged separately.',
    },

    // C2: PENDING — Venue Rental in 30 days at 12:00
    {
      id: BOOKING_C2_ID,
      tenantId: TENANT_C_ID,
      clientId: CLIENT_5_ID,
      serviceId: SERVICE_C_RENTAL_ID,
      status: 'PENDING' as const,
      startTime: dateAtTime(30, 12, 0),
      endTime: dateAtTime(30, 16, 0),
      totalAmount: '750',
      currency: 'USD',
      source: 'DIRECT' as const,
      guestCount: 150,
      notes: 'Wedding reception. Awaiting venue approval.',
    },
  ];

  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }

  console.log(`  Created ${bookings.length} bookings`);
}
