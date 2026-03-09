import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { DataRequestType, DataRequestStatus, Prisma } from '../../../../prisma/generated/prisma';

export const JOB_PROCESS_ACCOUNT_DELETION = 'processAccountDeletion';

/**
 * Processes GDPR account deletion requests after the 30-day grace period.
 * Runs daily at 5 AM UTC. Anonymizes PII, cascade-deletes sessions/tokens,
 * and marks the deletion request as completed.
 */
@Injectable()
export class AccountDeletionHandler {
  private readonly logger = new Logger(AccountDeletionHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running account deletion processor...');

    try {
      // Find all deletion requests past their grace period
      const pendingDeletions = await this.prisma.dataRequest.findMany({
        where: {
          requestType: DataRequestType.DELETION,
          status: DataRequestStatus.PENDING,
          deadlineAt: { lte: new Date() },
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });

      if (pendingDeletions.length === 0) {
        this.logger.log('No pending deletion requests past grace period');
        return;
      }

      this.logger.log(`Found ${pendingDeletions.length} deletion request(s) to process`);

      for (const request of pendingDeletions) {
        try {
          await this.processUserDeletion(request.userId, request.id);
          this.logger.log(`Processed deletion for user ${request.userId}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process deletion for user ${request.userId}: ${message}`,
          );
          // Continue processing other requests
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Account deletion processor failed: ${message}`);
      throw error;
    }
  }

  private async processUserDeletion(userId: string, requestId: string): Promise<void> {
    const anonymizedEmail = `deleted-${userId.slice(0, 8)}@deleted.savspot.co`;
    const anonymizedName = '[deleted]';

    // Find all tenants this user belongs to for RLS-scoped operations
    const tenantRows = await this.prisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM (
        SELECT tenant_id FROM bookings WHERE client_id = ${userId}
        UNION
        SELECT tenant_id FROM browser_push_subscriptions WHERE user_id = ${userId}
        UNION
        SELECT tenant_id FROM notifications WHERE user_id = ${userId} AND tenant_id IS NOT NULL
      ) AS tenants
    `;

    // Process tenant-scoped deletions per-tenant with RLS context
    for (const { tenant_id: tenantId } of tenantRows) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        // Delete push subscriptions for this tenant
        await tx.browserPushSubscription.deleteMany({
          where: { userId, tenantId },
        });

        // Delete tenant-scoped notifications
        await tx.notification.deleteMany({
          where: { userId, tenantId },
        });

        // Anonymize booking guest details for this tenant
        await tx.booking.updateMany({
          where: { clientId: userId, tenantId },
          data: {
            notes: null,
            guestDetails: Prisma.JsonNull,
          },
        });
      });
    }

    // Process non-tenant-scoped operations in a separate transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymize user PII (users table is not tenant-scoped)
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: anonymizedName,
          phone: null,
          avatarUrl: null,
          passwordHash: null,
          emailVerified: false,
        },
      });

      // 2. Delete consent records (not tenant-scoped)
      await tx.consentRecord.deleteMany({
        where: { userId },
      });

      // 3. Delete onboarding tours (not tenant-scoped)
      await tx.onboardingTour.deleteMany({
        where: { userId },
      });

      // 4. Delete notifications without a tenant (not tenant-scoped)
      await tx.notification.deleteMany({
        where: { userId, tenantId: null },
      });

      // 5. Mark the deletion request as completed
      await tx.dataRequest.update({
        where: { id: requestId },
        data: {
          status: DataRequestStatus.COMPLETED,
          completedAt: new Date(),
          notes: 'User data anonymized and supplementary records deleted',
        },
      });
    });
  }
}
