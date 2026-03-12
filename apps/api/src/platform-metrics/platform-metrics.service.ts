import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MetricDefinition {
  key: string;
  threshold: number;
  query: string;
  message: string;
}

const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'published_businesses',
    threshold: 200,
    query: `SELECT COUNT(*)::int AS value FROM tenants WHERE is_published = true AND status = 'ACTIVE'`,
    message: 'Directory trigger: >200 published businesses',
  },
  {
    key: 'custom_domain_requests',
    threshold: 20,
    query: `SELECT COUNT(*)::int AS value FROM feedback WHERE category = 'FEATURE_REQUEST' AND content ILIKE '%domain%' AND status != 'DECLINED'`,
    message: 'Custom domain trigger: >20 feature requests',
  },
  {
    key: 'multi_venue_tenants',
    threshold: 10,
    query: `SELECT COUNT(*)::int AS value FROM (SELECT tenant_id FROM venues WHERE is_active = true GROUP BY tenant_id HAVING COUNT(*) >= 2) sub`,
    message: 'Multi-location trigger: >10 multi-venue tenants',
  },
  {
    key: 'monthly_active_businesses',
    threshold: 500,
    query: `SELECT COUNT(DISTINCT tenant_id)::int AS value FROM bookings WHERE status = 'COMPLETED' AND created_at > NOW() - INTERVAL '30 days'`,
    message: 'Partner program trigger: >500 monthly active businesses',
  },
];

@Injectable()
export class PlatformMetricsService {
  private readonly logger = new Logger(PlatformMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeAllMetrics(): Promise<void> {
    this.logger.log('Computing all platform metrics...');

    for (const definition of METRIC_DEFINITIONS) {
      try {
        const result = await this.prisma.$queryRawUnsafe<
          Array<{ value: number }>
        >(definition.query);

        const value = result[0]?.value ?? 0;

        await this.prisma.platformMetric.create({
          data: {
            key: definition.key,
            value,
            measuredAt: new Date(),
          },
        });

        if (value > definition.threshold) {
          const existingAlert = await this.prisma.platformAlert.findFirst({
            where: {
              metricKey: definition.key,
              acknowledgedAt: null,
            },
          });

          if (!existingAlert) {
            await this.prisma.platformAlert.create({
              data: {
                metricKey: definition.key,
                threshold: definition.threshold,
                currentValue: value,
                message: definition.message,
              },
            });

            this.logger.warn(
              `Alert created: ${definition.message} (actual: ${value}, threshold: ${definition.threshold})`,
            );
          }
        }

        this.logger.log(`Metric ${definition.key}: ${value}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to compute metric ${definition.key}: ${message}`,
        );
      }
    }

    this.logger.log('Platform metrics computation complete');
  }

  async getAllMetrics() {
    const metricKeys = METRIC_DEFINITIONS.map((d) => d.key);

    const latestMetrics = await Promise.all(
      metricKeys.map((key) =>
        this.prisma.platformMetric.findFirst({
          where: { key },
          orderBy: { createdAt: 'desc' },
        }),
      ),
    );

    return latestMetrics.filter(Boolean);
  }

  async getMetricHistory(key: string) {
    return this.prisma.platformMetric.findMany({
      where: { key },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getUnacknowledgedAlerts() {
    return this.prisma.platformAlert.findMany({
      where: { acknowledgedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeAlert(id: string) {
    const alert = await this.prisma.platformAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return this.prisma.platformAlert.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }
}
