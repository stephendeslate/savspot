import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

interface WebhookLogRow {
  id: string;
  gateway: string;
  event_id: string;
  event_type: string;
  raw_data: Record<string, unknown>;
  processing_error: string;
  retry_count: number;
}

/**
 * Re-processes failed webhook logs where retry_count < MAX_RETRIES.
 * Scheduled every 10 minutes via BullMQ repeatable job.
 *
 * For each eligible webhook log:
 * 1. Increments the retry counter
 * 2. After MAX_RETRIES failures, creates a dead letter entry for manual review
 * 3. Marks the webhook log as processed (dead-lettered) once exhausted
 */
@Injectable()
export class ProcessWebhookRetriesHandler {
  private readonly logger = new Logger(ProcessWebhookRetriesHandler.name);

  private static readonly MAX_RETRIES = 5;

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running process webhook retries job...');

    try {
      // Find failed webhook logs eligible for retry:
      // - processed = false
      // - has a processing_error
      // - retry_count < MAX_RETRIES
      // - no existing dead letter entry
      const failedWebhooks = await this.prisma.$queryRaw<WebhookLogRow[]>`
        SELECT
          wl.id,
          wl.gateway,
          wl.event_id,
          wl.event_type,
          wl.raw_data,
          wl.processing_error,
          wl.retry_count
        FROM payment_webhook_logs wl
        LEFT JOIN webhook_dead_letters dl ON dl.webhook_log_id = wl.id
        WHERE wl.processed = false
          AND wl.processing_error IS NOT NULL
          AND wl.retry_count < ${ProcessWebhookRetriesHandler.MAX_RETRIES}
          AND dl.id IS NULL
        ORDER BY wl.created_at ASC
        LIMIT 100
      `;

      if (failedWebhooks.length === 0) {
        this.logger.log('No failed webhook logs eligible for retry');
        return;
      }

      let retriedCount = 0;
      let deadLetteredCount = 0;

      for (const webhook of failedWebhooks) {
        try {
          const newRetryCount = webhook.retry_count + 1;

          if (newRetryCount >= ProcessWebhookRetriesHandler.MAX_RETRIES) {
            // Max retries reached — move to dead letter
            await this.moveToDeadLetter(webhook);
            deadLetteredCount++;
          } else {
            // Increment retry count, mark for next attempt
            await this.incrementRetryCount(webhook);
            retriedCount++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process webhook retry for ${webhook.id}: ${message}`,
          );
        }
      }

      this.logger.log(
        `Processed ${failedWebhooks.length} webhook logs: ` +
        `${retriedCount} retried, ${deadLetteredCount} dead-lettered`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed process webhook retries: ${message}`);
      throw error;
    }
  }

  /**
   * Increments the retry counter on a webhook log.
   */
  private async incrementRetryCount(webhook: WebhookLogRow): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE payment_webhook_logs
      SET retry_count = retry_count + 1
      WHERE id = ${webhook.id}
    `;

    this.logger.log(
      `Webhook ${webhook.id} (${webhook.event_type}) retry count incremented to ${webhook.retry_count + 1}`,
    );
  }

  /**
   * Moves a webhook log to the dead letter table after exhausting retries.
   * Marks the original log as processed to prevent further retry attempts.
   */
  private async moveToDeadLetter(webhook: WebhookLogRow): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Create dead letter entry
      await tx.webhookDeadLetter.create({
        data: {
          webhookLogId: webhook.id,
          finalError: webhook.processing_error,
          retryCount: webhook.retry_count + 1,
        },
      });

      // Mark webhook log as processed (dead-lettered) and bump retry count
      await tx.$executeRaw`
        UPDATE payment_webhook_logs
        SET retry_count = retry_count + 1,
            processed = true
        WHERE id = ${webhook.id}
      `;
    });

    this.logger.warn(
      `Webhook ${webhook.id} (${webhook.event_type}) moved to dead letter after ${webhook.retry_count + 1} retries: ${webhook.processing_error}`,
    );
  }
}
