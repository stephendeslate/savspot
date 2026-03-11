import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

interface DateRange {
  from: Date;
  to: Date;
}

interface AnalyticsFilters {
  serviceId?: string;
  staffId?: string;
  source?: string;
  groupBy?: string;
}

export interface TrendDataPoint {
  period: string;
  value: number;
}

export interface OverviewKpis {
  totalBookings: number;
  totalRevenue: number;
  noShowRate: number;
  avgBookingValue: number;
  completedBookings: number;
  cancelledBookings: number;
}

export interface RevenueTrend {
  period: string;
  revenue: number;
  bookingCount: number;
}

export interface BookingTrend {
  period: string;
  total: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  completed: number;
}

export interface NoShowData {
  period: string;
  noShowCount: number;
  totalBookings: number;
  noShowRate: number;
}

export interface ClientMetrics {
  newClients: number;
  returningClients: number;
  rebookingRate: number;
  avgLifetimeValue: number;
}

interface FunnelStep {
  step: string;
  sessions: number;
  dropOffRate: number;
}

export interface FunnelData {
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  avgCompletionTimeSec: number;
  steps: FunnelStep[];
}

export interface UtilizationSlot {
  dayOfWeek: number;
  hour: number;
  utilization: number;
  bookingCount: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  totalBookings: number;
  totalRevenue: number;
  avgRating: number;
  noShowRate: number;
  completionRate: number;
}

export interface BenchmarkMetric {
  metricKey: string;
  tenantValue: number;
  p25: number;
  p50: number;
  p75: number;
}

@Injectable()
export class AnalyticsQueryService {
  private readonly logger = new Logger(AnalyticsQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<OverviewKpis> {
    const where = this.buildBookingWhere(tenantId, dateRange, filters);

    const [totals, revenue] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.booking.aggregate({
        where: { ...where, status: { in: ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS'] } },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of totals) {
      statusCounts[row.status] = row._count.id;
    }

    const totalBookings = totals.reduce((sum, r) => sum + r._count.id, 0);
    const noShowCount = statusCounts['NO_SHOW'] ?? 0;
    const completedCount = statusCounts['COMPLETED'] ?? 0;
    const cancelledCount = statusCounts['CANCELLED'] ?? 0;

    const eligibleForNoShow =
      completedCount + noShowCount + (statusCounts['IN_PROGRESS'] ?? 0);

    return {
      totalBookings,
      totalRevenue: revenue._sum.totalAmount?.toNumber() ?? 0,
      noShowRate:
        eligibleForNoShow > 0 ? noShowCount / eligibleForNoShow : 0,
      avgBookingValue: revenue._avg.totalAmount?.toNumber() ?? 0,
      completedBookings: completedCount,
      cancelledBookings: cancelledCount,
    };
  }

  async getRevenueTrends(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<RevenueTrend[]> {
    const truncFn = this.getDateTruncSql(filters.groupBy ?? 'day');
    const sourceFilter = filters.source
      ? Prisma.sql`AND b.source = ${filters.source}::text`
      : Prisma.empty;
    const serviceFilter = filters.serviceId
      ? Prisma.sql`AND b.service_id = ${filters.serviceId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{ period: Date; revenue: string; booking_count: bigint }>
    >`
      SELECT
        ${truncFn} AS period,
        COALESCE(SUM(b.total_amount), 0) AS revenue,
        COUNT(b.id) AS booking_count
      FROM bookings b
      WHERE b.tenant_id = ${tenantId}::uuid
        AND b.start_time >= ${dateRange.from}
        AND b.start_time <= ${dateRange.to}
        AND b.status IN ('COMPLETED', 'CONFIRMED', 'IN_PROGRESS')
        ${sourceFilter}
        ${serviceFilter}
      GROUP BY period
      ORDER BY period ASC
    `;

    return rows.map((row) => ({
      period: row.period.toISOString(),
      revenue: Number(row.revenue),
      bookingCount: Number(row.booking_count),
    }));
  }

  async getBookingTrends(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<BookingTrend[]> {
    const truncFn = this.getDateTruncSql(filters.groupBy ?? 'day');
    const sourceFilter = filters.source
      ? Prisma.sql`AND b.source = ${filters.source}::text`
      : Prisma.empty;
    const serviceFilter = filters.serviceId
      ? Prisma.sql`AND b.service_id = ${filters.serviceId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        total: bigint;
        confirmed: bigint;
        cancelled: bigint;
        no_show: bigint;
        completed: bigint;
      }>
    >`
      SELECT
        ${truncFn} AS period,
        COUNT(b.id) AS total,
        COUNT(b.id) FILTER (WHERE b.status = 'CONFIRMED') AS confirmed,
        COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED') AS cancelled,
        COUNT(b.id) FILTER (WHERE b.status = 'NO_SHOW') AS no_show,
        COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED') AS completed
      FROM bookings b
      WHERE b.tenant_id = ${tenantId}::uuid
        AND b.start_time >= ${dateRange.from}
        AND b.start_time <= ${dateRange.to}
        ${sourceFilter}
        ${serviceFilter}
      GROUP BY period
      ORDER BY period ASC
    `;

    return rows.map((row) => ({
      period: row.period.toISOString(),
      total: Number(row.total),
      confirmed: Number(row.confirmed),
      cancelled: Number(row.cancelled),
      noShow: Number(row.no_show),
      completed: Number(row.completed),
    }));
  }

  async getNoShowTrends(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<NoShowData[]> {
    const truncFn = this.getDateTruncSql(filters.groupBy ?? 'day');
    const sourceFilter = filters.source
      ? Prisma.sql`AND b.source = ${filters.source}::text`
      : Prisma.empty;
    const serviceFilter = filters.serviceId
      ? Prisma.sql`AND b.service_id = ${filters.serviceId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        no_show_count: bigint;
        total_bookings: bigint;
      }>
    >`
      SELECT
        ${truncFn} AS period,
        COUNT(b.id) FILTER (WHERE b.status = 'NO_SHOW') AS no_show_count,
        COUNT(b.id) FILTER (WHERE b.status IN ('COMPLETED', 'NO_SHOW', 'IN_PROGRESS')) AS total_bookings
      FROM bookings b
      WHERE b.tenant_id = ${tenantId}::uuid
        AND b.start_time >= ${dateRange.from}
        AND b.start_time <= ${dateRange.to}
        ${sourceFilter}
        ${serviceFilter}
      GROUP BY period
      ORDER BY period ASC
    `;

    return rows.map((row) => {
      const noShowCount = Number(row.no_show_count);
      const totalBookings = Number(row.total_bookings);
      return {
        period: row.period.toISOString(),
        noShowCount,
        totalBookings,
        noShowRate: totalBookings > 0 ? noShowCount / totalBookings : 0,
      };
    });
  }

  async getClientMetrics(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<ClientMetrics> {
    const serviceFilter = filters.serviceId
      ? Prisma.sql`AND b.service_id = ${filters.serviceId}::uuid`
      : Prisma.empty;
    const sourceFilter = filters.source
      ? Prisma.sql`AND b.source = ${filters.source}::text`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        new_clients: bigint;
        returning_clients: bigint;
        rebooking_rate: string;
        avg_lifetime_value: string;
      }>
    >`
      WITH client_bookings AS (
        SELECT
          b.client_id,
          COUNT(b.id) AS booking_count,
          SUM(b.total_amount) AS total_spent,
          MIN(b.created_at) AS first_booking
        FROM bookings b
        WHERE b.tenant_id = ${tenantId}::uuid
          AND b.start_time >= ${dateRange.from}
          AND b.start_time <= ${dateRange.to}
          AND b.status IN ('COMPLETED', 'CONFIRMED', 'IN_PROGRESS')
          ${serviceFilter}
          ${sourceFilter}
        GROUP BY b.client_id
      )
      SELECT
        COUNT(*) FILTER (WHERE cb.first_booking >= ${dateRange.from}) AS new_clients,
        COUNT(*) FILTER (WHERE cb.first_booking < ${dateRange.from}) AS returning_clients,
        CASE
          WHEN COUNT(*) > 0
          THEN COUNT(*) FILTER (WHERE cb.booking_count > 1)::decimal / COUNT(*)
          ELSE 0
        END AS rebooking_rate,
        COALESCE(AVG(cb.total_spent), 0) AS avg_lifetime_value
      FROM client_bookings cb
    `;

    const row = rows[0];
    return {
      newClients: Number(row?.new_clients ?? 0),
      returningClients: Number(row?.returning_clients ?? 0),
      rebookingRate: Number(row?.rebooking_rate ?? 0),
      avgLifetimeValue: Number(row?.avg_lifetime_value ?? 0),
    };
  }

  async getFunnelData(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<FunnelData> {
    const analytics = await this.prisma.bookingFlowAnalytics.findMany({
      where: {
        tenantId,
        date: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      orderBy: { date: 'asc' },
    });

    if (analytics.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        conversionRate: 0,
        avgCompletionTimeSec: 0,
        steps: [],
      };
    }

    const totalSessions = analytics.reduce(
      (sum, a) => sum + a.totalSessions,
      0,
    );
    const completedSessions = analytics.reduce(
      (sum, a) => sum + a.completedSessions,
      0,
    );

    const totalCompletionTime = analytics.reduce(
      (sum, a) => sum + a.avgCompletionTimeSec * a.completedSessions,
      0,
    );

    const stepAggregation = new Map<
      string,
      { sessions: number; dropOffs: number }
    >();

    for (const analytic of analytics) {
      const stepMetrics = analytic.stepMetrics as Array<{
        step: string;
        sessions: number;
        dropOffs: number;
      }> | null;

      if (!Array.isArray(stepMetrics)) continue;

      for (const step of stepMetrics) {
        const existing = stepAggregation.get(step.step) ?? {
          sessions: 0,
          dropOffs: 0,
        };
        existing.sessions += step.sessions;
        existing.dropOffs += step.dropOffs;
        stepAggregation.set(step.step, existing);
      }
    }

    const steps: FunnelStep[] = [];
    for (const [stepName, data] of stepAggregation) {
      steps.push({
        step: stepName,
        sessions: data.sessions,
        dropOffRate:
          data.sessions > 0 ? data.dropOffs / data.sessions : 0,
      });
    }

    return {
      totalSessions,
      completedSessions,
      conversionRate:
        totalSessions > 0 ? completedSessions / totalSessions : 0,
      avgCompletionTimeSec:
        completedSessions > 0
          ? Math.round(totalCompletionTime / completedSessions)
          : 0,
      steps,
    };
  }

  async getUtilizationHeatmap(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<UtilizationSlot[]> {
    const serviceFilter = filters.serviceId
      ? Prisma.sql`AND b.service_id = ${filters.serviceId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        day_of_week: number;
        hour_of_day: number;
        booking_count: bigint;
      }>
    >`
      SELECT
        EXTRACT(DOW FROM b.start_time)::int AS day_of_week,
        EXTRACT(HOUR FROM b.start_time)::int AS hour_of_day,
        COUNT(b.id) AS booking_count
      FROM bookings b
      WHERE b.tenant_id = ${tenantId}::uuid
        AND b.start_time >= ${dateRange.from}
        AND b.start_time <= ${dateRange.to}
        AND b.status IN ('COMPLETED', 'CONFIRMED', 'IN_PROGRESS')
        ${serviceFilter}
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day
    `;

    const maxCount = rows.reduce(
      (max, r) => Math.max(max, Number(r.booking_count)),
      1,
    );

    return rows.map((row) => ({
      dayOfWeek: row.day_of_week,
      hour: row.hour_of_day,
      bookingCount: Number(row.booking_count),
      utilization: Number(row.booking_count) / maxCount,
    }));
  }

  async getStaffPerformance(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<StaffPerformance[]> {
    const staffFilter = filters.staffId
      ? Prisma.sql`AND tm.user_id = ${filters.staffId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        staff_id: string;
        staff_name: string;
        total_bookings: bigint;
        total_revenue: string;
        no_show_count: bigint;
        completed_count: bigint;
        eligible_count: bigint;
      }>
    >`
      SELECT
        tm.user_id AS staff_id,
        COALESCE(u.name, u.email) AS staff_name,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(b.total_amount), 0) AS total_revenue,
        COUNT(b.id) FILTER (WHERE b.status = 'NO_SHOW') AS no_show_count,
        COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED') AS completed_count,
        COUNT(b.id) FILTER (WHERE b.status IN ('COMPLETED', 'NO_SHOW', 'IN_PROGRESS')) AS eligible_count
      FROM tenant_memberships tm
      JOIN users u ON u.id = tm.user_id
      LEFT JOIN bookings b ON b.tenant_id = tm.tenant_id
        AND b.start_time >= ${dateRange.from}
        AND b.start_time <= ${dateRange.to}
        AND (b.metadata->>'staffId' = tm.user_id::text OR b.checked_in_by = tm.user_id::text)
      WHERE tm.tenant_id = ${tenantId}::uuid
        AND tm.role IN ('OWNER', 'ADMIN', 'STAFF')
        ${staffFilter}
      GROUP BY tm.user_id, u.name, u.email
      ORDER BY total_bookings DESC
    `;

    return rows.map((row) => {
      const eligible = Number(row.eligible_count);
      return {
        staffId: row.staff_id,
        staffName: row.staff_name,
        totalBookings: Number(row.total_bookings),
        totalRevenue: Number(row.total_revenue),
        avgRating: 0,
        noShowRate:
          eligible > 0 ? Number(row.no_show_count) / eligible : 0,
        completionRate:
          eligible > 0 ? Number(row.completed_count) / eligible : 0,
      };
    });
  }

  async getBenchmarks(
    tenantId: string,
  ): Promise<BenchmarkMetric[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { category: true, benchmarkOptOut: true },
    });

    if (!tenant || tenant.benchmarkOptOut) {
      return [];
    }

    const benchmarks = await this.prisma.categoryBenchmark.findMany({
      where: { businessCategory: tenant.category },
    });

    const overview = await this.getOverview(
      tenantId,
      {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      {},
    );

    const tenantMetrics: Record<string, number> = {
      avg_booking_value: overview.avgBookingValue,
      no_show_rate: overview.noShowRate,
      total_bookings: overview.totalBookings,
      total_revenue: overview.totalRevenue,
    };

    return benchmarks.map((b) => ({
      metricKey: b.metricKey,
      tenantValue: tenantMetrics[b.metricKey] ?? 0,
      p25: b.p25.toNumber(),
      p50: b.p50.toNumber(),
      p75: b.p75.toNumber(),
    }));
  }

  async getBenchmarkTrends(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<TrendDataPoint[]> {
    const truncFn = this.getDateTruncSql(filters.groupBy ?? 'month');

    const rows = await this.prisma.$queryRaw<
      Array<{ period: Date; avg_value: string }>
    >`
      SELECT
        ${truncFn} AS period,
        AVG(b.total_amount) AS avg_value
      FROM bookings b
      WHERE b.tenant_id = ${tenantId}::uuid
        AND b.start_time >= ${dateRange.from}
        AND b.start_time <= ${dateRange.to}
        AND b.status IN ('COMPLETED', 'CONFIRMED', 'IN_PROGRESS')
      GROUP BY period
      ORDER BY period ASC
    `;

    return rows.map((row) => ({
      period: row.period.toISOString(),
      value: Number(row.avg_value),
    }));
  }

  private buildBookingWhere(
    tenantId: string,
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {
      tenantId,
      startTime: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    };

    if (filters.serviceId) {
      where.serviceId = filters.serviceId;
    }

    if (filters.source) {
      where.source = filters.source as Prisma.BookingWhereInput['source'];
    }

    return where;
  }

  private getDateTruncSql(groupBy: string): Prisma.Sql {
    switch (groupBy) {
      case 'week':
        return Prisma.sql`date_trunc('week', b.start_time)`;
      case 'month':
        return Prisma.sql`date_trunc('month', b.start_time)`;
      default:
        return Prisma.sql`date_trunc('day', b.start_time)`;
    }
  }
}
