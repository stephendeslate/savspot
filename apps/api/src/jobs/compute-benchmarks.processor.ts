import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

interface BenchmarkRow {
  business_category: string;
  metric_key: string;
  p25: number;
  p50: number;
  p75: number;
  sample_size: bigint;
}

@Injectable()
export class ComputeBenchmarksHandler {
  private readonly logger = new Logger(ComputeBenchmarksHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Starting category benchmark computation');

    const benchmarkData = await this.prisma.$queryRaw<BenchmarkRow[]>`
      WITH eligible_tenants AS (
        SELECT id, category
        FROM tenants
        WHERE status = 'ACTIVE'
          AND benchmark_opt_out = false
      ),
      category_counts AS (
        SELECT category, COUNT(*) AS cnt
        FROM eligible_tenants
        GROUP BY category
        HAVING COUNT(*) >= 4
      ),
      tenant_metrics AS (
        SELECT
          t.id AS tenant_id,
          t.category AS business_category,
          -- Bookings per month (last 90 days extrapolated)
          COUNT(b.id)::float / 3.0 AS bookings_per_month,
          -- No-show rate
          CASE WHEN COUNT(b.id) = 0 THEN 0
            ELSE COUNT(b.id) FILTER (WHERE b.status = 'NO_SHOW')::float / COUNT(b.id)::float
          END AS no_show_rate,
          -- Average booking value
          COALESCE(AVG(b.total_amount), 0)::float AS avg_booking_value,
          -- Utilization rate (simplified: completed / total scheduled)
          CASE WHEN COUNT(b.id) = 0 THEN 0
            ELSE COUNT(b.id) FILTER (WHERE b.status IN ('COMPLETED', 'IN_PROGRESS'))::float / COUNT(b.id)::float
          END AS utilization_rate
        FROM eligible_tenants t
        JOIN category_counts cc ON cc.category = t.category
        LEFT JOIN bookings b ON b.tenant_id = t.id
          AND b.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY t.id, t.category
      ),
      benchmarks AS (
        SELECT
          business_category,
          'bookings_per_month' AS metric_key,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY bookings_per_month)::float AS p25,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bookings_per_month)::float AS p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY bookings_per_month)::float AS p75,
          COUNT(*) AS sample_size
        FROM tenant_metrics
        GROUP BY business_category
        UNION ALL
        SELECT
          business_category,
          'no_show_rate' AS metric_key,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY no_show_rate)::float AS p25,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY no_show_rate)::float AS p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY no_show_rate)::float AS p75,
          COUNT(*) AS sample_size
        FROM tenant_metrics
        GROUP BY business_category
        UNION ALL
        SELECT
          business_category,
          'avg_booking_value' AS metric_key,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_booking_value)::float AS p25,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_booking_value)::float AS p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_booking_value)::float AS p75,
          COUNT(*) AS sample_size
        FROM tenant_metrics
        GROUP BY business_category
        UNION ALL
        SELECT
          business_category,
          'utilization_rate' AS metric_key,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY utilization_rate)::float AS p25,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY utilization_rate)::float AS p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY utilization_rate)::float AS p75,
          COUNT(*) AS sample_size
        FROM tenant_metrics
        GROUP BY business_category
      )
      SELECT * FROM benchmarks
    `;

    let upserted = 0;
    for (const row of benchmarkData) {
      try {
        await this.prisma.categoryBenchmark.upsert({
          where: {
            businessCategory_metricKey: {
              businessCategory: row.business_category as 'VENUE' | 'SALON' | 'STUDIO' | 'FITNESS' | 'PROFESSIONAL' | 'OTHER',
              metricKey: row.metric_key,
            },
          },
          update: {
            p25: row.p25,
            p50: row.p50,
            p75: row.p75,
            sampleSize: Number(row.sample_size),
            computedAt: new Date(),
          },
          create: {
            businessCategory: row.business_category as 'VENUE' | 'SALON' | 'STUDIO' | 'FITNESS' | 'PROFESSIONAL' | 'OTHER',
            metricKey: row.metric_key,
            p25: row.p25,
            p50: row.p50,
            p75: row.p75,
            sampleSize: Number(row.sample_size),
            computedAt: new Date(),
          },
        });
        upserted++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to upsert benchmark ${row.business_category}/${row.metric_key}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Benchmark computation complete: ${upserted} metrics upserted`,
    );
  }
}
