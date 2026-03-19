import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReserveSlotParams {
  tenantId: string;
  sessionId: string;
  serviceId: string;
  venueId?: string;
  staffId?: string;
  startTime: Date;
  endTime: Date;
}

export interface DateReservationRow {
  id: string;
  tenant_id: string;
  session_id: string;
  venue_id: string | null;
  service_id: string;
  staff_id: string | null;
  reserved_date: Date;
  start_time: Date;
  end_time: Date;
  token: string;
  expires_at: Date;
  status: string;
  created_at: Date;
}

@Injectable()
export class ReservationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserve a time slot using pessimistic locking.
   *
   * CRITICAL: Uses $queryRaw with explicit transaction, NOT Prisma Client Extensions.
   * This prevents nested transaction issues with SELECT ... FOR UPDATE.
   */
  async reserveSlot(params: ReserveSlotParams): Promise<DateReservationRow> {
    const { tenantId, sessionId, serviceId, venueId, staffId, startTime, endTime } = params;

    return this.prisma.$transaction(async (tx) => {
      // Set tenant context for RLS
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      // Check for conflicting HELD reservations with FOR UPDATE lock
      // When staffId is provided, only the same staff member's slots conflict.
      // Different staff members CAN have overlapping slots for the same service.
      const conflicts = staffId
        ? await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM date_reservations
            WHERE tenant_id = ${tenantId}
              AND service_id = ${serviceId}
              AND staff_id = ${staffId}
              AND status = 'HELD'
              AND expires_at > NOW()
              AND start_time < ${endTime}
              AND end_time > ${startTime}
            FOR UPDATE`
        : await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM date_reservations
            WHERE tenant_id = ${tenantId}
              AND service_id = ${serviceId}
              AND status = 'HELD'
              AND expires_at > NOW()
              AND start_time < ${endTime}
              AND end_time > ${startTime}
            FOR UPDATE`;

      if (Array.isArray(conflicts) && conflicts.length > 0) {
        throw new ConflictException('Slot already reserved');
      }

      // Check for conflicting confirmed bookings
      const bookingConflicts = staffId
        ? await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM bookings
            WHERE tenant_id = ${tenantId}
              AND service_id = ${serviceId}
              AND staff_id = ${staffId}
              AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')
              AND start_time < ${endTime}
              AND end_time > ${startTime}
            FOR UPDATE`
        : await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM bookings
            WHERE tenant_id = ${tenantId}
              AND service_id = ${serviceId}
              AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')
              AND start_time < ${endTime}
              AND end_time > ${startTime}
            FOR UPDATE`;

      if (Array.isArray(bookingConflicts) && bookingConflicts.length > 0) {
        throw new ConflictException('Slot already booked');
      }

      // Create reservation with 5-minute expiry
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const dateStr = startTime.toISOString().split('T')[0] as string;
      const reservedDate = new Date(dateStr);

      const result = await tx.$queryRaw<DateReservationRow[]>`
        INSERT INTO date_reservations (
          id, tenant_id, session_id, service_id, venue_id, staff_id,
          reserved_date, start_time, end_time, token, expires_at, status, created_at
        )
        VALUES (
          gen_random_uuid(), ${tenantId}, ${sessionId}, ${serviceId}, ${venueId ?? null}, ${staffId ?? null},
          ${reservedDate}, ${startTime}, ${endTime}, gen_random_uuid()::text, ${expiresAt}, 'HELD', NOW()
        )
        RETURNING *`;

      const reservation = result[0];
      if (!reservation) {
        throw new Error('Failed to create reservation');
      }

      return reservation;
    });
  }

  /**
   * Release a held reservation (set status to RELEASED).
   */
  async releaseReservation(tenantId: string, token: string): Promise<void> {
    const reservation = await this.prisma.dateReservation.findFirst({
      where: {
        tenantId,
        token,
        status: 'HELD',
      },
    });

    if (!reservation) {
      throw new NotFoundException('Active reservation not found');
    }

    await this.prisma.dateReservation.update({
      where: { id: reservation.id },
      data: { status: 'RELEASED' },
    });
  }

  /**
   * Convert a held reservation to confirmed (set status to CONFIRMED).
   * Called when a booking is completed from a session.
   */
  async convertReservation(tenantId: string, token: string): Promise<void> {
    const reservation = await this.prisma.dateReservation.findFirst({
      where: {
        tenantId,
        token,
        status: 'HELD',
      },
    });

    if (!reservation) {
      throw new NotFoundException('Active reservation not found');
    }

    await this.prisma.dateReservation.update({
      where: { id: reservation.id },
      data: { status: 'CONFIRMED' },
    });
  }

  /**
   * Release all held reservations for a given session.
   */
  async releaseAllForSession(tenantId: string, sessionId: string): Promise<void> {
    await this.prisma.dateReservation.updateMany({
      where: {
        tenantId,
        sessionId,
        status: 'HELD',
      },
      data: { status: 'RELEASED' },
    });
  }
}
