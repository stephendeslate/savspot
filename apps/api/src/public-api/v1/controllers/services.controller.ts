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
import { PrismaService } from '../../../prisma/prisma.service';
import { Public } from '../../../common/decorators/public.decorator';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe';
import { PublicApiKeyGuard } from '../guards/api-key.guard';
import { ApiVersionInterceptor } from '../interceptors/api-version.interceptor';
import { ApiKeyScopes } from '../../decorators/api-key-scopes.decorator';
import { ListServicesDto } from '../dto/list-services.dto';
import { transformService } from '../transformers/service.transformer';

@ApiTags('Public API - Services')
@Public()
@UseGuards(PublicApiKeyGuard)
@UseInterceptors(ApiVersionInterceptor)
@Controller('api/v1')
export class ServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('businesses/:businessId/services')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiKeyScopes('services:read')
  @ApiOperation({ summary: 'List services for a business' })
  @ApiResponse({ status: 200, description: 'List of services' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async listServicesForBusiness(
    @Param('businessId', UuidValidationPipe) businessId: string,
    @Query() query: ListServicesDto,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: businessId, isPublished: true, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Business not found');
    }

    const where: Record<string, unknown> = {
      tenantId: businessId,
      isActive: true,
    };

    if (query.categoryId) {
      where['categoryId'] = query.categoryId;
    }

    const services = await this.prisma.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        basePrice: true,
        currency: true,
        pricingModel: true,
        guestConfig: true,
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      data: services.map((s: Parameters<typeof transformService>[0]) => transformService(s)),
    };
  }

  @Get('services/:id')
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  @ApiKeyScopes('services:read')
  @ApiOperation({ summary: 'Get service details' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceDetail(@Param('id', UuidValidationPipe) id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        basePrice: true,
        currency: true,
        pricingModel: true,
        guestConfig: true,
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const addOns = await this.prisma.serviceAddon.findMany({
      where: { serviceId: id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      data: transformService(service, addOns),
    };
  }
}
