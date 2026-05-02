import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UpcomingBookingRow {
  id: string;
  tenant_id: string;
  client_id: string;
  service_id: string;
  start_time: Date;
}

interface NoShowRateRow {
  no_show_count: bigint;
  total_count: bigint;
}

interface DayOfWeekRateRow {
  day_of_week: number;
  no_show_rate: number;
}

interface ServiceRateRow {
  service_id: string;
  no_show_rate: number;
}

@Injectable()
export class ComputeNoShowRiskHandler {
  private readonly logger = new Logger(ComputeNoShowRiskHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(): Promise<void> {
    this.logger.log('Starting no-show risk computation');

    const upcomingBookings = await this.prisma.$queryRaw<UpcomingBookingRow[]>`
      SELECT id, tenant_id, client_id, service_id, start_time
      FROM bookings
      WHERE status = 'CONFIRMED'
        AND start_time > NOW()
      LIMIT 5000
    `;

    if (upcomingBookings.length === 0) {
      this.logger.log('No upcoming confirmed bookings to score');
      return;
    }

    const tenantIds = [...new Set(upcomingBookings.map((b) => b.tenant_id))];
    let updated = 0;

    for (const tenantId of tenantIds) {
      try {
        const tenantBookings = upcomingBookings.filter(
          (b) => b.tenant_id === tenantId,
        );

        const dayOfWeekRates = await this.prisma.$queryRaw<DayOfWeekRateRow[]>`
          SELECT
            EXTRACT(DOW FROM start_time)::int AS day_of_week,
            CASE WHEN COUNT(*) = 0 THEN 0
              ELSE COUNT(*) FILTER (WHERE status = 'NO_SHOW')::float / COUNT(*)::float
            END AS no_show_rate
          FROM bookings
          WHERE tenant_id = ${tenantId}
            AND status IN ('COMPLETED', 'NO_SHOW')
          GROUP BY EXTRACT(DOW FROM start_time)
        `;

        const dayOfWeekMap = new Map<number, number>();
        let daySum = 0;
        for (const row of dayOfWeekRates) {
          dayOfWeekMap.set(row.day_of_week, row.no_show_rate);
          daySum += row.no_show_rate;
        }
        const dayMean =
          dayOfWeekRates.length > 0 ? daySum / dayOfWeekRates.length : 1;

        const serviceRates = await this.prisma.$queryRaw<ServiceRateRow[]>`
          SELECT
            service_id,
            CASE WHEN COUNT(*) = 0 THEN 0
              ELSE COUNT(*) FILTER (WHERE status = 'NO_SHOW')::float / COUNT(*)::float
            END AS no_show_rate
          FROM bookings
          WHERE tenant_id = ${tenantId}
            AND status IN ('COMPLETED', 'NO_SHOW')
          GROUP BY service_id
        `;

        const serviceMap = new Map<string, number>();
        let serviceSum = 0;
        for (const row of serviceRates) {
          serviceMap.set(row.service_id, row.no_show_rate);
          serviceSum += row.no_show_rate;
        }
        const serviceMean =
          serviceRates.length > 0 ? serviceSum / serviceRates.length : 1;

        const BATCH_SIZE = 100;
        for (let i = 0; i < tenantBookings.length; i += BATCH_SIZE) {
          const batch = tenantBookings.slice(i, i + BATCH_SIZE);
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

            for (const booking of batch) {
              const clientHistory = await tx.$queryRaw<NoShowRateRow[]>`
                SELECT
                  COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show_count,
                  COUNT(*) AS total_count
                FROM bookings
                WHERE tenant_id = ${tenantId}
                  AND client_id = ${booking.client_id}
                  AND status IN ('COMPLETED', 'NO_SHOW')
              `;

              const row = clientHistory[0];
              const totalBookings = Number(row?.total_count ?? 0);
              const noShows = Number(row?.no_show_count ?? 0);
              const baseScore =
                totalBookings > 0 ? noShows / totalBookings : 0.5;

              const hoursUntil =
                (booking.start_time.getTime() - Date.now()) / (1000 * 60 * 60);
              let leadTimeFactor = 1.0;
              if (hoursUntil > 14 * 24) leadTimeFactor = 1.3;
              else if (hoursUntil < 24) leadTimeFactor = 0.7;

              const completedCount = totalBookings - noShows;
              const firstTimeFactor = completedCount === 0 ? 1.5 : 1.0;

              const bookingDow = booking.start_time.getUTCDay();
              const dayRate = dayOfWeekMap.get(bookingDow) ?? dayMean;
              const dayFactor = dayMean > 0 ? dayRate / dayMean : 1.0;

              const serviceRate =
                serviceMap.get(booking.service_id) ?? serviceMean;
              const serviceFactor =
                serviceMean > 0 ? serviceRate / serviceMean : 1.0;

              let score =
                baseScore *
                leadTimeFactor *
                firstTimeFactor *
                dayFactor *
                serviceFactor;
              score = Math.max(0, Math.min(1, score));

              const roundedScore = Math.round(score * 100) / 100;

              await tx.$executeRaw`
                UPDATE bookings
                SET no_show_risk_score = ${roundedScore}
                WHERE id = ${booking.id}
              `;

              updated++;
            }
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `No-show risk computation failed for tenant ${tenantId}: ${message}`,
        );
      }
    }

    this.logger.log(`No-show risk scores updated for ${updated} bookings`);
  }
}
