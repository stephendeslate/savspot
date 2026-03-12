import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDirectoryDto } from './dto/search-directory.dto';
import { clampPageSize } from '../common/utils/pagination';

const PRIVACY_FLOOR = 4;

export interface DirectorySearchRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  address: Prisma.JsonValue;
  logo_url: string | null;
  cover_photo_url: string | null;
  brand_color: string | null;
  average_rating: number | null;
  review_count: number;
  response_time_min: number | null;
  total_bookings: number;
  relevance: number;
  distance_miles: number;
}

interface CountRow {
  count: bigint;
}

export interface CategoryRow {
  category: string;
  business_count: number;
}

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchDirectoryDto) {
    const {
      q,
      category,
      lat,
      lng,
      radius = 25,
      sort = 'relevance',
      min_rating,
      page = 1,
      limit: rawLimit = 20,
    } = dto;
    const limit = clampPageSize(rawLimit, 20);
    const offset = (page - 1) * limit;

    const hasGeo = lat != null && lng != null;

    const conditions: string[] = [
      't.is_published = true',
      't.status = \'ACTIVE\'',
    ];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(`t.search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(q);
      paramIndex++;
    }

    if (category) {
      conditions.push(`t.category = $${paramIndex}::"BusinessCategory"`);
      params.push(category);
      paramIndex++;
    }

    if (min_rating != null) {
      conditions.push(`dl.average_rating >= $${paramIndex}`);
      params.push(min_rating);
      paramIndex++;
    }

    const geoLngIdx = hasGeo ? paramIndex++ : 0;
    const geoLatIdx = hasGeo ? paramIndex++ : 0;
    if (hasGeo) {
      params.push(lng!);
      params.push(lat!);
      conditions.push(
        `point(CAST(t.address->>'lng' AS float), CAST(t.address->>'lat' AS float)) <@> point($${geoLngIdx}, $${geoLatIdx}) < $${paramIndex}`,
      );
      params.push(radius);
      paramIndex++;
    }

    const relevanceExpr = q
      ? `ts_rank(t.search_vector, plainto_tsquery('english', $1)) AS relevance`
      : '0 AS relevance';

    const distanceExpr = hasGeo
      ? `point(CAST(t.address->>'lng' AS float), CAST(t.address->>'lat' AS float)) <@> point($${geoLngIdx}, $${geoLatIdx}) AS distance_miles`
      : '0 AS distance_miles';

    let orderByClause: string;
    if (sort === 'rating') {
      orderByClause = 'dl.average_rating DESC NULLS LAST';
    } else if (sort === 'distance' && hasGeo) {
      orderByClause = 'distance_miles ASC';
    } else {
      orderByClause = q ? 'relevance DESC' : 'dl.review_count DESC NULLS LAST';
    }

    const limitIdx = paramIndex;
    const offsetIdx = paramIndex + 1;
    params.push(limit);
    params.push(offset);

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT t.id, t.name, t.slug, t.description, t.category, t.address,
             t.logo_url, t.cover_photo_url, t.brand_color,
             dl.average_rating, dl.review_count, dl.response_time_min, dl.total_bookings,
             ${relevanceExpr},
             ${distanceExpr}
      FROM tenants t
      JOIN directory_listings dl ON dl.tenant_id = t.id
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const results = await this.prisma.$queryRawUnsafe<DirectorySearchRow[]>(
      query,
      ...params,
    );

    const countQuery = `
      SELECT COUNT(*)::bigint AS count
      FROM tenants t
      JOIN directory_listings dl ON dl.tenant_id = t.id
      WHERE ${whereClause}
    `;

    // Count query uses the same params minus the LIMIT/OFFSET ones
    const countParams = params.slice(0, params.length - 2);
    const countResult = await this.prisma.$queryRawUnsafe<CountRow[]>(
      countQuery,
      ...countParams,
    );

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategories() {
    const categories = await this.prisma.$queryRaw<CategoryRow[]>`
      SELECT t.category, COUNT(*)::int AS business_count
      FROM tenants t
      JOIN directory_listings dl ON dl.tenant_id = t.id
      WHERE t.is_published = true AND t.status = 'ACTIVE'
      GROUP BY t.category
      HAVING COUNT(*) >= ${PRIVACY_FLOOR}
      ORDER BY business_count DESC
    `;
    return categories;
  }

  async getBusinessBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, isPublished: true, status: 'ACTIVE' },
      include: {
        services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        directoryListing: true,
        venues: { where: { isActive: true } },
        reviews: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Business not found: ${slug}`);
    }

    return tenant;
  }

  async getBusinessReviews(slug: string, page: number, rawLimit: number) {
    const limit = clampPageSize(rawLimit, 10);

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Business not found: ${slug}`);
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { client: { select: { name: true, avatarUrl: true } } },
      }),
      this.prisma.review.count({ where: { tenantId: tenant.id } }),
    ]);

    return {
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBusinessAvailability(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Business not found: ${slug}`);
    }

    const rules = await this.prisma.availabilityRule.findMany({
      where: { tenantId: tenant.id },
    });

    return rules;
  }
}
