import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Expires held date reservations that have passed their expiry time.
 * Scheduled every 5 minutes via BullMQ repeatable job.
 *
 * Sets app.current_tenant per-tenant within transactions for RLS compatibility.
 */
@Injectable()
export class ExpireReservationsHandler {
  private readonly logger = new Logger(ExpireReservationsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running expire reservations job...');

    try {
      const now = new Date();

      // Query distinct tenant IDs with held reservations past expiry
      const tenantRows = await this.prisma.$queryRaw<Array<{ tenant_id: string }>>`
        SELECT DISTINCT tenant_id FROM date_reservations
        WHERE status = 'HELD' AND expires_at < ${now}
      `;

      let totalExpired = 0;

      for (const { tenant_id: tenantId } of tenantRows) {
        const result = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

          return tx.dateReservation.updateMany({
            where: {
              status: 'HELD',
              expiresAt: { lt: now },
            },
            data: {
              status: 'EXPIRED',
            },
          });
        });

        totalExpired += result.count;
      }

      this.logger.log(
        `Expired ${totalExpired} held reservation(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to expire reservations: ${message}`);
      throw error;
    }
  }
}
