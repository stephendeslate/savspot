import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Expires held date reservations that have passed their expiry time.
 * Scheduled every 5 minutes via BullMQ repeatable job.
 *
 * TODO: When migrating to a non-superuser DB role, this processor must set
 * app.current_tenant per-tenant (iterate tenants or use raw SQL that bypasses RLS)
 * because FORCE ROW LEVEL SECURITY will block cross-tenant updateMany.
 */
@Injectable()
export class ExpireReservationsHandler {
  private readonly logger = new Logger(ExpireReservationsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running expire reservations job...');

    try {
      const result = await this.prisma.dateReservation.updateMany({
        where: {
          status: 'HELD',
          expiresAt: { lt: new Date() },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      this.logger.log(
        `Expired ${result.count} held reservation(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to expire reservations: ${message}`);
      throw error;
    }
  }
}
