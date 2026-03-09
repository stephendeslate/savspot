import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ListClientsDto } from './dto/list-clients.dto';
import { clampPageSize } from '../common/utils/pagination';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List clients for a tenant with aggregated stats, search, tag filtering,
   * sorting, and pagination.
   */
  async findAll(tenantId: string, filters: ListClientsDto) {
    const {
      search,
      tags,
      sortBy = 'lastVisit',
      sortOrder = 'desc',
      page = 1,
      limit: rawLimit = 20,
    } = filters;
    const limit = clampPageSize(rawLimit);
    const skip = (page - 1) * limit;

    // Build the where clause for ClientProfile
    const where: Prisma.ClientProfileWhereInput = { tenantId };

    // Search by name, email, or phone on the related User
    if (search) {
      where.client = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Tag filtering — tags are stored as JSON array in ClientProfile.tags
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      // Filter profiles where tags JSON array contains all specified tags
      where.AND = tagList.map((tag) => ({
        tags: {
          array_contains: [tag],
        },
      })) as Prisma.ClientProfileWhereInput[];
    }

    // Fetch client profiles with user data
    const [profiles, total] = await Promise.all([
      this.prisma.clientProfile.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.clientProfile.count({ where }),
    ]);

    // Fetch aggregated booking stats for all client IDs in this page
    const clientIds = profiles.map((p) => p.clientId);

    const stats =
      clientIds.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              client_id: string;
              total_bookings: bigint;
              total_revenue: Prisma.Decimal | null;
              last_visit: Date | null;
              first_visit: Date | null;
              no_show_count: bigint;
            }>
          >`
            SELECT
              b.client_id,
              COUNT(b.id)::bigint AS total_bookings,
              COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_amount ELSE 0 END), 0) AS total_revenue,
              MAX(CASE WHEN b.status = 'COMPLETED' THEN b.start_time END) AS last_visit,
              MIN(CASE WHEN b.status = 'COMPLETED' THEN b.start_time END) AS first_visit,
              COUNT(CASE WHEN b.status = 'NO_SHOW' THEN 1 END)::bigint AS no_show_count
            FROM bookings b
            WHERE b.tenant_id = ${tenantId}
              AND b.client_id = ANY(${clientIds}::text[])
            GROUP BY b.client_id
          `
        : [];

    // Build a lookup map for stats
    const statsMap = new Map(
      (stats as Array<{
        client_id: string;
        total_bookings: bigint;
        total_revenue: Prisma.Decimal | null;
        last_visit: Date | null;
        first_visit: Date | null;
        no_show_count: bigint;
      }>).map((s) => [
        s.client_id,
        {
          totalBookings: Number(s.total_bookings),
          totalRevenue: s.total_revenue ? Number(s.total_revenue) : 0,
          lastVisitDate: s.last_visit,
          firstVisitDate: s.first_visit,
          noShowCount: Number(s.no_show_count),
        },
      ]),
    );

    // Combine profiles with stats
    const data = profiles.map((profile) => {
      const clientStats = statsMap.get(profile.clientId) ?? {
        totalBookings: 0,
        totalRevenue: 0,
        lastVisitDate: null,
        firstVisitDate: null,
        noShowCount: 0,
      };

      return {
        id: profile.id,
        clientId: profile.clientId,
        name: profile.client.name,
        email: profile.client.email,
        phone: profile.client.phone,
        avatarUrl: profile.client.avatarUrl,
        tags: profile.tags,
        preferences: profile.preferences,
        internalRating: profile.internalRating,
        createdAt: profile.createdAt,
        ...clientStats,
      };
    });

    // Sort in-memory based on sortBy/sortOrder
    data.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'lastVisit': {
          const aDate = a.lastVisitDate
            ? new Date(a.lastVisitDate).getTime()
            : 0;
          const bDate = b.lastVisitDate
            ? new Date(b.lastVisitDate).getTime()
            : 0;
          cmp = aDate - bDate;
          break;
        }
        case 'totalBookings':
          cmp = a.totalBookings - b.totalBookings;
          break;
        case 'totalRevenue':
          cmp = a.totalRevenue - b.totalRevenue;
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single client profile with user info, recent bookings (last 10),
   * recent payments (last 10), and notes.
   */
  async findById(tenantId: string, clientId: string) {
    const profile = await this.prisma.clientProfile.findFirst({
      where: { id: clientId, tenantId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Client not found');
    }

    // Fetch recent bookings for this client at this tenant
    const recentBookings = await this.prisma.booking.findMany({
      where: { tenantId, clientId: profile.clientId },
      include: {
        service: {
          select: { id: true, name: true, durationMinutes: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 10,
    });

    // Fetch recent payments for this client's bookings at this tenant
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        booking: { clientId: profile.clientId },
      },
      include: {
        booking: {
          select: { id: true, startTime: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Fetch notes for this client
    const notes = await this.prisma.note.findMany({
      where: {
        tenantId,
        entityType: 'CLIENT',
        entityId: profile.clientId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate stats
    const stats = await this.prisma.$queryRaw<
      Array<{
        total_bookings: bigint;
        total_revenue: Prisma.Decimal | null;
        last_visit: Date | null;
        first_visit: Date | null;
        no_show_count: bigint;
      }>
    >`
      SELECT
        COUNT(b.id)::bigint AS total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_amount ELSE 0 END), 0) AS total_revenue,
        MAX(CASE WHEN b.status = 'COMPLETED' THEN b.start_time END) AS last_visit,
        MIN(CASE WHEN b.status = 'COMPLETED' THEN b.start_time END) AS first_visit,
        COUNT(CASE WHEN b.status = 'NO_SHOW' THEN 1 END)::bigint AS no_show_count
      FROM bookings b
      WHERE b.tenant_id = ${tenantId}
        AND b.client_id = ${profile.clientId}
    `;

    const clientStats = stats[0]
      ? {
          totalBookings: Number(stats[0].total_bookings),
          totalRevenue: stats[0].total_revenue
            ? Number(stats[0].total_revenue)
            : 0,
          lastVisitDate: stats[0].last_visit,
          firstVisitDate: stats[0].first_visit,
          noShowCount: Number(stats[0].no_show_count),
        }
      : {
          totalBookings: 0,
          totalRevenue: 0,
          lastVisitDate: null,
          firstVisitDate: null,
          noShowCount: 0,
        };

    return {
      id: profile.id,
      clientId: profile.clientId,
      name: profile.client.name,
      email: profile.client.email,
      phone: profile.client.phone,
      avatarUrl: profile.client.avatarUrl,
      tags: profile.tags,
      preferences: profile.preferences,
      internalRating: profile.internalRating,
      clientCreatedAt: profile.client.createdAt,
      profileCreatedAt: profile.createdAt,
      ...clientStats,
      recentBookings,
      recentPayments,
      notes,
    };
  }

  /**
   * Update ClientProfile tags, notes, internalNotes.
   * Upserts if the profile doesn't exist yet (uses preferences JSON for notes).
   */
  async update(tenantId: string, clientId: string, data: UpdateClientDto) {
    // Look up the profile by its ID
    const existing = await this.prisma.clientProfile.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Client profile not found');
    }

    const updateData: Prisma.ClientProfileUpdateInput = {};

    if (data.tags !== undefined) {
      updateData.tags = data.tags as Prisma.InputJsonValue;
    }

    // Store notes and internalNotes in the preferences JSON field
    if (data.notes !== undefined || data.internalNotes !== undefined) {
      const currentPrefs =
        (existing.preferences as Record<string, unknown>) ?? {};
      const updatedPrefs = { ...currentPrefs };

      if (data.notes !== undefined) {
        updatedPrefs['notes'] = data.notes;
      }
      if (data.internalNotes !== undefined) {
        updatedPrefs['internalNotes'] = data.internalNotes;
      }

      updateData.preferences = updatedPrefs as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.clientProfile.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    this.logger.log(`Client profile ${clientId} updated for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Create a client profile manually.
   * Finds or creates a User by email, then creates the ClientProfile.
   */
  async create(tenantId: string, data: CreateClientDto) {
    // Check if a user with this email already exists
    let user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone ?? null,
        },
      });
      this.logger.log(`Created new user ${user.id} for email ${data.email}`);
    }

    // Check if a ClientProfile already exists for this tenant+client
    const existingProfile = await this.prisma.clientProfile.findUnique({
      where: {
        tenantId_clientId: {
          tenantId,
          clientId: user.id,
        },
      },
    });

    if (existingProfile) {
      throw new ConflictException(
        'Client profile already exists for this tenant',
      );
    }

    const preferences: Record<string, unknown> = {};
    if (data.notes) {
      preferences['notes'] = data.notes;
    }

    const profile = await this.prisma.clientProfile.create({
      data: {
        tenantId,
        clientId: user.id,
        tags: data.tags ? (data.tags as Prisma.InputJsonValue) : undefined,
        preferences: Object.keys(preferences).length > 0
          ? (preferences as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    this.logger.log(
      `Created client profile ${profile.id} for user ${user.id} in tenant ${tenantId}`,
    );

    return profile;
  }
}
