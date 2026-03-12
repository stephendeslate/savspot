import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RiskLevel } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

interface ChurnRiskRow {
  client_id: string;
  tenant_id: string;
  last_booking: Date;
  median_interval_days: number;
  days_since_last: number;
}

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function computeRiskLevel(score: number): RiskLevel {
  if (score < 0.3) return 'LOW';
  if (score < 0.6) return 'MEDIUM';
  if (score < 0.85) return 'HIGH';
  return 'CRITICAL';
}

@Injectable()
export class ChurnRiskService {
  private readonly logger = new Logger(ChurnRiskService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getClientChurnRisk(clientId: string, tenantId: string) {
    const score = await this.prisma.churnRiskScore.findUnique({
      where: { clientId_tenantId: { clientId, tenantId } },
    });

    if (!score) {
      return { clientId, tenantId, riskLevel: null, score: null };
    }

    return score;
  }

  async getAtRiskClients(tenantId: string, minLevel?: string) {
    const threshold = minLevel && minLevel in RISK_LEVEL_ORDER
      ? RISK_LEVEL_ORDER[minLevel as RiskLevel]
      : RISK_LEVEL_ORDER.MEDIUM;

    const riskLevels = (Object.entries(RISK_LEVEL_ORDER) as Array<[RiskLevel, number]>)
      .filter(([, order]) => order >= threshold)
      .map(([level]) => level);

    return this.prisma.churnRiskScore.findMany({
      where: {
        tenantId,
        riskLevel: { in: riskLevels },
      },
      orderBy: { score: 'desc' },
    });
  }

  async computeChurnRisk(): Promise<void> {
    this.logger.log('Computing churn risk scores...');

    const rows = await this.prisma.$queryRaw<ChurnRiskRow[]>`
      WITH booking_intervals AS (
        SELECT
          client_id,
          tenant_id,
          start_time,
          LAG(start_time) OVER (
            PARTITION BY client_id, tenant_id ORDER BY start_time
          ) AS prev_booking,
          EXTRACT(EPOCH FROM (
            start_time - LAG(start_time) OVER (
              PARTITION BY client_id, tenant_id ORDER BY start_time
            )
          )) / 86400.0 AS interval_days
        FROM bookings
        WHERE status IN ('CONFIRMED', 'COMPLETED')
      ),
      client_stats AS (
        SELECT
          client_id,
          tenant_id,
          MAX(start_time) AS last_booking,
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY interval_days
          ) AS median_interval_days,
          EXTRACT(EPOCH FROM (NOW() - MAX(start_time))) / 86400.0 AS days_since_last
        FROM booking_intervals
        WHERE interval_days IS NOT NULL
        GROUP BY client_id, tenant_id
        HAVING COUNT(*) >= 2
      )
      SELECT
        client_id,
        tenant_id,
        last_booking,
        median_interval_days,
        days_since_last
      FROM client_stats
    `;

    let upserted = 0;
    for (const row of rows) {
      const medianInterval = Number(row.median_interval_days);
      const daysSinceLast = Number(row.days_since_last);

      if (medianInterval <= 0) continue;

      const rawScore = daysSinceLast / (1.5 * medianInterval);
      const score = Math.min(rawScore, 1.0);
      const riskLevel = computeRiskLevel(score);

      const expectedNext = new Date(row.last_booking);
      expectedNext.setDate(expectedNext.getDate() + Math.round(medianInterval));

      await this.prisma.churnRiskScore.upsert({
        where: {
          clientId_tenantId: {
            clientId: row.client_id,
            tenantId: row.tenant_id,
          },
        },
        update: {
          riskLevel,
          score: new Prisma.Decimal(score.toFixed(4)),
          factors: {
            daysSinceLast: Math.round(daysSinceLast),
            medianIntervalDays: Math.round(medianInterval),
            rawScore: Number(rawScore.toFixed(4)),
          },
          lastBooking: row.last_booking,
          expectedNext,
          computedAt: new Date(),
        },
        create: {
          clientId: row.client_id,
          tenantId: row.tenant_id,
          riskLevel,
          score: new Prisma.Decimal(score.toFixed(4)),
          factors: {
            daysSinceLast: Math.round(daysSinceLast),
            medianIntervalDays: Math.round(medianInterval),
            rawScore: Number(rawScore.toFixed(4)),
          },
          lastBooking: row.last_booking,
          expectedNext,
          computedAt: new Date(),
        },
      });
      upserted++;
    }

    this.logger.log(`Upserted ${upserted} churn risk scores`);
  }
}
