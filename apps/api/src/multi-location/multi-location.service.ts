import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface VenueAnalyticsRow {
  total_bookings: bigint;
  total_revenue: string | null;
  avg_utilization: string | null;
}

interface CrossLocationRow {
  venue_id: string;
  venue_name: string;
  total_bookings: bigint;
  total_revenue: string | null;
  avg_utilization: string | null;
}

@Injectable()
export class MultiLocationService {
  private readonly logger = new Logger(MultiLocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getVenueStaff(venueId: string) {
    return this.prisma.venueStaff.findMany({
      where: { venueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignStaff(venueId: string, userId: string, isPrimary: boolean) {
    return this.prisma.venueStaff.upsert({
      where: {
        venueId_userId: { venueId, userId },
      },
      create: {
        venueId,
        userId,
        isPrimary,
      },
      update: {
        isPrimary,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeStaff(venueId: string, userId: string) {
    return this.prisma.venueStaff.delete({
      where: {
        venueId_userId: { venueId, userId },
      },
    });
  }

  async getVenueAnalytics(venueId: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRawUnsafe<VenueAnalyticsRow[]>(
      `SELECT
         COUNT(b.id)::bigint AS total_bookings,
         COALESCE(SUM(b.total_amount), 0)::text AS total_revenue,
         CASE
           WHEN COUNT(b.id) = 0 THEN '0'
           ELSE ROUND(
             COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED')::numeric
             / NULLIF(COUNT(b.id), 0)::numeric * 100,
             2
           )::text
         END AS avg_utilization
       FROM bookings b
       WHERE b.venue_id = $1
         AND b.start_time >= $2
         AND b.start_time < $3`,
      venueId,
      from,
      to,
    );

    const row = rows[0];
    return {
      totalBookings: Number(row?.total_bookings ?? 0),
      totalRevenue: row?.total_revenue ?? '0',
      utilization: row?.avg_utilization ?? '0',
    };
  }

  async getCrossLocationAnalytics(tenantId: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRawUnsafe<CrossLocationRow[]>(
      `SELECT
         v.id AS venue_id,
         v.name AS venue_name,
         COUNT(b.id)::bigint AS total_bookings,
         COALESCE(SUM(b.total_amount), 0)::text AS total_revenue,
         CASE
           WHEN COUNT(b.id) = 0 THEN '0'
           ELSE ROUND(
             COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED')::numeric
             / NULLIF(COUNT(b.id), 0)::numeric * 100,
             2
           )::text
         END AS avg_utilization
       FROM venues v
       LEFT JOIN bookings b
         ON b.venue_id = v.id
         AND b.start_time >= $2
         AND b.start_time < $3
       WHERE v.tenant_id = $1
         AND v.is_active = true
       GROUP BY v.id, v.name
       ORDER BY v.name`,
      tenantId,
      from,
      to,
    );

    return rows.map((row) => ({
      venueId: row.venue_id,
      venueName: row.venue_name,
      totalBookings: Number(row.total_bookings),
      totalRevenue: row.total_revenue ?? '0',
      utilization: row.avg_utilization ?? '0',
    }));
  }
}
