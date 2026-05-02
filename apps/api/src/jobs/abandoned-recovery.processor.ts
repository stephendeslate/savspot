import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from '../communications/communications.service';

/**
 * Marks stale booking sessions as ABANDONED, releases their held reservations,
 * and sends recovery emails to clients encouraging them to complete their booking.
 * Scheduled hourly via BullMQ repeatable job.
 *
 * Sets app.current_tenant per-tenant within transactions for RLS compatibility.
 */
@Injectable()
export class AbandonedRecoveryHandler {
  private readonly logger = new Logger(AbandonedRecoveryHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async handle(): Promise<void> {
    this.logger.log('Running abandoned booking recovery job...');

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Find stale in-progress sessions with client and service info
      // Query without tenant context to find all eligible sessions across tenants
      const staleSessions = await this.prisma.$queryRaw<
        Array<{
          id: string;
          tenant_id: string;
          client_id: string | null;
          service_id: string | null;
          service_name: string | null;
          tenant_name: string;
          tenant_slug: string | null;
          tenant_logo_url: string | null;
          tenant_brand_color: string | null;
        }>
      >`
        SELECT
          bs.id,
          bs.tenant_id,
          bs.client_id,
          bs.service_id,
          s.name AS service_name,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          t.logo_url AS tenant_logo_url,
          t.brand_color AS tenant_brand_color
        FROM booking_sessions bs
        LEFT JOIN services s ON s.id = bs.service_id
        JOIN tenants t ON t.id = bs.tenant_id
        WHERE bs.status = 'IN_PROGRESS'
          AND bs.updated_at < ${oneHourAgo}
      `;

      if (staleSessions.length === 0) {
        this.logger.log('No abandoned booking sessions found');
        return;
      }

      // Group sessions by tenant for per-tenant RLS context
      const sessionsByTenant = new Map<string, typeof staleSessions>();
      for (const session of staleSessions) {
        const existing = sessionsByTenant.get(session.tenant_id) ?? [];
        existing.push(session);
        sessionsByTenant.set(session.tenant_id, existing);
      }

      let totalAbandoned = 0;
      let totalReleased = 0;

      for (const [tenantId, tenantSessions] of sessionsByTenant) {
        const sessionIds = tenantSessions.map((s) => s.id);

        const result = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

          // Mark sessions as ABANDONED
          const updatedSessions = await tx.bookingSession.updateMany({
            where: {
              id: { in: sessionIds },
              status: 'IN_PROGRESS',
            },
            data: {
              status: 'ABANDONED',
            },
          });

          // Release any HELD reservations for these sessions
          const releasedReservations = await tx.dateReservation.updateMany({
            where: {
              sessionId: { in: sessionIds },
              status: 'HELD',
            },
            data: {
              status: 'RELEASED',
            },
          });

          return { abandoned: updatedSessions.count, released: releasedReservations.count };
        });

        totalAbandoned += result.abandoned;
        totalReleased += result.released;
      }

      this.logger.log(
        `Abandoned ${totalAbandoned} session(s), released ${totalReleased} reservation(s)`,
      );

      // Send recovery emails to sessions that have a clientId with a valid email
      let emailsSent = 0;
      let emailsSkipped = 0;

      const sessionsWithClients = staleSessions.filter((s) => s.client_id);

      for (const session of sessionsWithClients) {
        try {
          // Look up the client email within tenant context
          const clients = await this.prisma.$queryRaw<
            Array<{ id: string; email: string; name: string }>
          >`
            SELECT id, email, name FROM users WHERE id = ${session.client_id!} LIMIT 1
          `;

          const client = clients[0];

          if (!client?.email) {
            this.logger.debug(
              `Session ${session.id}: client ${session.client_id} has no email — skipping recovery email`,
            );
            emailsSkipped++;
            continue;
          }

          // Build the rebooking URL using the tenant slug and service
          const rebookUrl = session.tenant_slug && session.service_id
            ? `/${session.tenant_slug}?service=${session.service_id}`
            : `/${session.tenant_slug ?? ''}`;

          await this.communicationsService.createAndSend({
            tenantId: session.tenant_id,
            recipientId: client.id,
            recipientEmail: client.email,
            recipientName: client.name,
            channel: 'EMAIL',
            templateKey: 'abandoned-booking-recovery',
            templateData: {
              clientName: client.name,
              serviceName: session.service_name ?? 'your selected service',
              businessName: session.tenant_name,
              logoUrl: session.tenant_logo_url,
              brandColor: session.tenant_brand_color,
              rebookUrl,
            },
          });

          emailsSent++;

          this.logger.log(
            `Recovery email enqueued for session ${session.id} to ${client.email}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to send recovery email for session ${session.id}: ${message}`,
          );
        }
      }

      this.logger.log(
        `Recovery emails: sent=${emailsSent} skipped=${emailsSkipped} (of ${sessionsWithClients.length} with clients)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed abandoned booking recovery: ${message}`);
      throw error;
    }
  }
}
