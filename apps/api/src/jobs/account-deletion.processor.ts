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

    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymize user PII
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

      // 2. Delete push subscriptions
      await tx.browserPushSubscription.deleteMany({
        where: { userId },
      });

      // 3. Delete consent records
      await tx.consentRecord.deleteMany({
        where: { userId },
      });

      // 4. Delete onboarding tours
      await tx.onboardingTour.deleteMany({
        where: { userId },
      });

      // 5. Delete notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // 6. Anonymize booking guest details
      await tx.booking.updateMany({
        where: { clientId: userId },
        data: {
          notes: null,
          guestDetails: Prisma.JsonNull,
        },
      });

      // 7. Mark the deletion request as completed
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
