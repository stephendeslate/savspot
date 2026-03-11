import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Prisma } from '../../../../../../prisma/generated/prisma';
import { PrismaService } from '../../../prisma/prisma.service';
import { Public } from '../../../common/decorators/public.decorator';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe';
import { PublicApiKeyGuard } from '../guards/api-key.guard';
import { ApiVersionInterceptor } from '../interceptors/api-version.interceptor';
import { ListBusinessesDto } from '../dto/list-businesses.dto';
import { transformBusiness } from '../transformers/business.transformer';

@ApiTags('Public API - Businesses')
@Public()
@UseGuards(PublicApiKeyGuard)
@UseInterceptors(ApiVersionInterceptor)
@Controller('api/v1/businesses')
export class BusinessesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'List published businesses' })
  @ApiResponse({ status: 200, description: 'Paginated list of businesses' })
  async listBusinesses(@Query() query: ListBusinessesDto) {
    const limit = query.limit ?? 20;

    const where: Prisma.TenantWhereInput = {
      isPublished: true,
      status: 'ACTIVE',
    };

    if (query.category) {
      where.category = query.category as Prisma.TenantWhereInput['category'];
    }

    if (query.query) {
      where.name = { contains: query.query, mode: 'insensitive' };
    }

    const cursorOption: { cursor?: { id: string }; skip?: number } = {};
    if (query.cursor) {
      cursorOption.cursor = { id: query.cursor };
      cursorOption.skip = 1;
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        categoryLabel: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        logoUrl: true,
        coverPhotoUrl: true,
        timezone: true,
        currency: true,
      },
      orderBy: { name: 'asc' },
      take: limit + 1,
      ...cursorOption,
    });

    const hasMore = tenants.length > limit;
    const results = hasMore ? tenants.slice(0, limit) : tenants;
    const nextCursor = hasMore && results.length > 0
      ? results[results.length - 1]!.id
      : null;

    return {
      data: results.map(transformBusiness),
      pagination: {
        next_cursor: nextCursor,
        has_more: hasMore,
      },
    };
  }

  @Get(':id')
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get business details' })
  @ApiResponse({ status: 200, description: 'Business details' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getBusinessDetail(@Param('id', UuidValidationPipe) id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id,
        isPublished: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        categoryLabel: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        logoUrl: true,
        coverPhotoUrl: true,
        timezone: true,
        currency: true,
        _count: {
          select: { services: { where: { isActive: true } } },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Business not found');
    }

    return {
      data: {
        ...transformBusiness(tenant),
        servicesCount: tenant._count.services,
      },
    };
  }
}
