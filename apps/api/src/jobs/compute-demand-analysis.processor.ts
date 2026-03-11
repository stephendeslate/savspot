import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

interface TenantRow {
  tenant_id: string;
}

interface SlotMetricRow {
  day_of_week: number;
  time_slot: string;
  fill_rate: number;
  avg_days_to_fill: number;
  cancellation_rate: number;
  consecutive_low_weeks: bigint;
}

@Injectable()
export class ComputeDemandAnalysisHandler {
  private readonly logger = new Logger(ComputeDemandAnalysisHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Starting weekly demand analysis');

    const eligibleTenants = await this.prisma.$queryRaw<TenantRow[]>`
      SELECT tenant_id
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY tenant_id
      HAVING COUNT(*) >= 30
    `;

    if (eligibleTenants.length === 0) {
      this.logger.log('No tenants eligible for demand analysis');
      return;
    }

    let totalInserts = 0;

    for (const { tenant_id: tenantId } of eligibleTenants) {
      try {
        const slotMetrics = await this.prisma.$queryRaw<SlotMetricRow[]>`
          WITH slot_data AS (
            SELECT
              EXTRACT(DOW FROM start_time)::int AS day_of_week,
              TO_CHAR(start_time, 'HH24:MI') AS time_slot,
              status,
              EXTRACT(EPOCH FROM (start_time - created_at)) / 86400 AS days_to_fill,
              EXTRACT(WEEK FROM start_time) AS week_num
            FROM bookings
            WHERE tenant_id = ${tenantId}
              AND start_time >= NOW() - INTERVAL '90 days'
          ),
          slot_metrics AS (
            SELECT
              day_of_week,
              time_slot,
              COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'CONFIRMED', 'IN_PROGRESS'))::float
                / NULLIF(COUNT(*), 0)::float AS fill_rate,
              AVG(days_to_fill) AS avg_days_to_fill,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::float
                / NULLIF(COUNT(*), 0)::float AS cancellation_rate
            FROM slot_data
            GROUP BY day_of_week, time_slot
          ),
          weekly_fill AS (
            SELECT
              day_of_week,
              time_slot,
              week_num,
              COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'CONFIRMED', 'IN_PROGRESS'))::float
                / NULLIF(COUNT(*), 0)::float AS weekly_fill_rate
            FROM slot_data
            GROUP BY day_of_week, time_slot, week_num
          ),
          consecutive_empty AS (
            SELECT
              day_of_week,
              time_slot,
              COUNT(*) FILTER (WHERE weekly_fill_rate < 0.2) AS consecutive_low_weeks
            FROM weekly_fill
            GROUP BY day_of_week, time_slot
          )
          SELECT
            sm.day_of_week,
            sm.time_slot,
            COALESCE(sm.fill_rate, 0) AS fill_rate,
            COALESCE(sm.avg_days_to_fill, 0) AS avg_days_to_fill,
            COALESCE(sm.cancellation_rate, 0) AS cancellation_rate,
            COALESCE(ce.consecutive_low_weeks, 0) AS consecutive_low_weeks
          FROM slot_metrics sm
          LEFT JOIN consecutive_empty ce
            ON ce.day_of_week = sm.day_of_week AND ce.time_slot = sm.time_slot
        `;

        interface InsightCandidate {
          insightType: 'LOW_FILL_SLOT' | 'HIGH_DEMAND_SLOT' | 'CANCELLATION_PATTERN';
          dayOfWeek: number;
          timeSlot: string;
          metricValue: number;
          recommendation: string;
        }

        const insights: InsightCandidate[] = [];

        for (const slot of slotMetrics) {
          if (
            Number(slot.consecutive_low_weeks) >= 6 &&
            slot.fill_rate < 0.2
          ) {
            insights.push({
              insightType: 'LOW_FILL_SLOT',
              dayOfWeek: slot.day_of_week,
              timeSlot: slot.time_slot,
              metricValue: slot.fill_rate,
              recommendation: `This time slot (day ${slot.day_of_week}, ${slot.time_slot}) has had less than 20% fill rate for 6+ weeks. Consider removing it or offering a discount.`,
            });
          }

          if (slot.fill_rate > 0.9 && slot.avg_days_to_fill < 2) {
            insights.push({
              insightType: 'HIGH_DEMAND_SLOT',
              dayOfWeek: slot.day_of_week,
              timeSlot: slot.time_slot,
              metricValue: slot.fill_rate,
              recommendation: `This time slot (day ${slot.day_of_week}, ${slot.time_slot}) fills within ${slot.avg_days_to_fill.toFixed(1)} days with ${(slot.fill_rate * 100).toFixed(0)}% fill rate. Consider adding more availability or raising prices.`,
            });
          }

          if (slot.cancellation_rate > 0.3) {
            insights.push({
              insightType: 'CANCELLATION_PATTERN',
              dayOfWeek: slot.day_of_week,
              timeSlot: slot.time_slot,
              metricValue: slot.cancellation_rate,
              recommendation: `This time slot (day ${slot.day_of_week}, ${slot.time_slot}) has a ${(slot.cancellation_rate * 100).toFixed(0)}% cancellation rate. Consider requiring deposits or stricter cancellation policies.`,
            });
          }
        }

        const topInsights = insights.slice(0, 3);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

          for (const insight of topInsights) {
            await tx.slotDemandInsight.create({
              data: {
                tenantId,
                insightType: insight.insightType,
                dayOfWeek: insight.dayOfWeek,
                timeSlot: insight.timeSlot,
                metricValue: insight.metricValue,
                recommendation: insight.recommendation,
                computedAt: now,
                expiresAt,
              },
            });
            totalInserts++;
          }
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Demand analysis failed for tenant ${tenantId}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Demand analysis complete: ${totalInserts} insights created for ${eligibleTenants.length} tenants`,
    );
  }
}
