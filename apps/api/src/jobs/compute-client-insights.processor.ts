import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReminderBucketRow {
  tenant_id: string;
  client_id: string;
  lead_hours_bucket: number;
  attendance_rate: number;
  reminder_count: bigint;
}

interface RebookingRow {
  tenant_id: string;
  client_id: string;
  median_interval_days: number;
}

@Injectable()
export class ComputeClientInsightsHandler {
  private readonly logger = new Logger(ComputeClientInsightsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(): Promise<void> {
    this.logger.log('Starting client insights computation');

    await this.computeOptimalReminderTiming();
    await this.computeRebookingIntervals();

    this.logger.log('Client insights computation complete');
  }

  private async computeOptimalReminderTiming(): Promise<void> {
    const bucketResults = await this.prisma.$queryRaw<ReminderBucketRow[]>`
      WITH client_reminder_bookings AS (
        SELECT
          b.tenant_id,
          b.client_id,
          b.id AS booking_id,
          b.status,
          br.sent_at,
          EXTRACT(EPOCH FROM (b.start_time - br.sent_at)) / 3600 AS lead_hours
        FROM bookings b
        JOIN booking_reminders br ON br.booking_id = b.id
        WHERE b.status IN ('COMPLETED', 'NO_SHOW')
          AND br.sent_at IS NOT NULL
      ),
      client_counts AS (
        SELECT tenant_id, client_id, COUNT(*) AS total
        FROM client_reminder_bookings
        GROUP BY tenant_id, client_id
        HAVING COUNT(*) >= 5
      ),
      bucketed AS (
        SELECT
          crb.tenant_id,
          crb.client_id,
          CASE
            WHEN crb.lead_hours <= 3 THEN 2
            WHEN crb.lead_hours <= 8 THEN 4
            WHEN crb.lead_hours <= 18 THEN 12
            WHEN crb.lead_hours <= 36 THEN 24
            ELSE 48
          END AS lead_hours_bucket,
          CASE WHEN crb.status = 'COMPLETED' THEN 1 ELSE 0 END AS attended
        FROM client_reminder_bookings crb
        JOIN client_counts cc ON cc.tenant_id = crb.tenant_id AND cc.client_id = crb.client_id
      )
      SELECT
        tenant_id,
        client_id,
        lead_hours_bucket,
        AVG(attended)::float AS attendance_rate,
        COUNT(*) AS reminder_count
      FROM bucketed
      GROUP BY tenant_id, client_id, lead_hours_bucket
      ORDER BY tenant_id, client_id, attendance_rate DESC
    `;

    const clientBest = new Map<string, { bucket: number; rate: number }>();
    for (const row of bucketResults) {
      const key = `${row.tenant_id}:${row.client_id}`;
      const existing = clientBest.get(key);
      if (!existing || row.attendance_rate > existing.rate) {
        clientBest.set(key, {
          bucket: row.lead_hours_bucket,
          rate: row.attendance_rate,
        });
      }
    }

    let updatedCount = 0;
    for (const [key, { bucket }] of clientBest) {
      const [tenantId, clientId] = key.split(':') as [string, string];
      try {
        await this.prisma.clientProfile.upsert({
          where: { tenantId_clientId: { tenantId, clientId } },
          update: { optimalReminderLeadHours: bucket },
          create: {
            tenantId,
            clientId,
            optimalReminderLeadHours: bucket,
          },
        });
        updatedCount++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to update reminder timing for ${key}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Updated optimal reminder timing for ${updatedCount} clients`,
    );
  }

  private async computeRebookingIntervals(): Promise<void> {
    const rebookingResults = await this.prisma.$queryRaw<RebookingRow[]>`
      WITH client_service_bookings AS (
        SELECT
          tenant_id,
          client_id,
          service_id,
          start_time,
          LAG(start_time) OVER (
            PARTITION BY tenant_id, client_id, service_id
            ORDER BY start_time
          ) AS prev_start_time
        FROM bookings
        WHERE status = 'COMPLETED'
      ),
      intervals AS (
        SELECT
          tenant_id,
          client_id,
          service_id,
          EXTRACT(EPOCH FROM (start_time - prev_start_time)) / 86400 AS interval_days
        FROM client_service_bookings
        WHERE prev_start_time IS NOT NULL
      ),
      qualified_clients AS (
        SELECT tenant_id, client_id, service_id
        FROM intervals
        GROUP BY tenant_id, client_id, service_id
        HAVING COUNT(*) >= 2
      )
      SELECT
        i.tenant_id,
        i.client_id,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY i.interval_days)::float AS median_interval_days
      FROM intervals i
      JOIN qualified_clients qc
        ON qc.tenant_id = i.tenant_id
        AND qc.client_id = i.client_id
        AND qc.service_id = i.service_id
      GROUP BY i.tenant_id, i.client_id
    `;

    let updatedCount = 0;
    for (const row of rebookingResults) {
      try {
        const days = Math.round(row.median_interval_days);
        if (days <= 0) continue;

        await this.prisma.clientProfile.upsert({
          where: {
            tenantId_clientId: {
              tenantId: row.tenant_id,
              clientId: row.client_id,
            },
          },
          update: { rebookingIntervalDays: days },
          create: {
            tenantId: row.tenant_id,
            clientId: row.client_id,
            rebookingIntervalDays: days,
          },
        });
        updatedCount++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to update rebooking interval for ${row.tenant_id}:${row.client_id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Updated rebooking intervals for ${updatedCount} clients`,
    );
  }
}
