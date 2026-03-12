import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const CACHE_TTL = 1800;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * List all active services for a tenant.
   */
  async findAll(tenantId: string) {
    const cacheKey = `services:list:${tenantId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      /* fall through to DB */
    }

    const services = await this.prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
        venue: {
          select: { id: true, name: true },
        },
      },
    });

    this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(services)).catch(() => {});

    return services;
  }

  /**
   * Get a single service by ID within a tenant.
   */
  async findById(tenantId: string, id: string) {
    const cacheKey = `service:${tenantId}:${id}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      /* fall through to DB */
    }

    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
      include: {
        category: {
          select: { id: true, name: true },
        },
        venue: {
          select: { id: true, name: true },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(service)).catch(() => {});

    return service;
  }

  /**
   * Create a new service for a tenant.
   */
  async create(tenantId: string, dto: CreateServiceDto) {
    const result = await this.prisma.service.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes ?? 60,
        basePrice: dto.basePrice ?? 0,
        currency: dto.currency,
        pricingModel: (dto.pricingModel as 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM') ?? 'FIXED',
        confirmationMode:
          (dto.confirmationMode as 'AUTO_CONFIRM' | 'MANUAL_APPROVAL') ??
          'AUTO_CONFIRM',
        categoryId: dto.categoryId,
        venueId: dto.venueId,
        bufferBeforeMinutes: dto.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: dto.bufferAfterMinutes ?? 0,
        autoCancelOnOverdue: dto.autoCancelOnOverdue,
        maxRescheduleCount: dto.maxRescheduleCount,
        noShowGraceMinutes: dto.noShowGraceMinutes,
        approvalDeadlineHours: dto.approvalDeadlineHours,
        guestConfig: dto.guestConfig
          ? (dto.guestConfig as Prisma.InputJsonValue)
          : undefined,
        tierConfig: dto.tierConfig
          ? (dto.tierConfig as Prisma.InputJsonValue)
          : undefined,
        depositConfig: dto.depositConfig
          ? (dto.depositConfig as Prisma.InputJsonValue)
          : undefined,
        intakeFormConfig: dto.intakeFormConfig
          ? (dto.intakeFormConfig as Prisma.InputJsonValue)
          : undefined,
        cancellationPolicy: dto.cancellationPolicy
          ? (dto.cancellationPolicy as Prisma.InputJsonValue)
          : undefined,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        venue: {
          select: { id: true, name: true },
        },
      },
    });

    this.redis.del(`services:list:${tenantId}`).catch(() => {});

    return result;
  }

  /**
   * Update a service.
   */
  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    // Verify the service exists and belongs to this tenant
    await this.findById(tenantId, id);

    const data: Prisma.ServiceUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.pricingModel !== undefined) {
      data.pricingModel = dto.pricingModel as 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
    }
    if (dto.confirmationMode !== undefined) {
      data.confirmationMode = dto.confirmationMode as 'AUTO_CONFIRM' | 'MANUAL_APPROVAL';
    }
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.venueId !== undefined) {
      data.venue = { connect: { id: dto.venueId } };
    }
    if (dto.bufferBeforeMinutes !== undefined) data.bufferBeforeMinutes = dto.bufferBeforeMinutes;
    if (dto.bufferAfterMinutes !== undefined) data.bufferAfterMinutes = dto.bufferAfterMinutes;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.autoCancelOnOverdue !== undefined) data.autoCancelOnOverdue = dto.autoCancelOnOverdue;
    if (dto.maxRescheduleCount !== undefined) data.maxRescheduleCount = dto.maxRescheduleCount;
    if (dto.noShowGraceMinutes !== undefined) data.noShowGraceMinutes = dto.noShowGraceMinutes;
    if (dto.approvalDeadlineHours !== undefined) data.approvalDeadlineHours = dto.approvalDeadlineHours;

    if (dto.guestConfig !== undefined) {
      data.guestConfig = dto.guestConfig as Prisma.InputJsonValue;
    }
    if (dto.tierConfig !== undefined) {
      data.tierConfig = dto.tierConfig as Prisma.InputJsonValue;
    }
    if (dto.depositConfig !== undefined) {
      data.depositConfig = dto.depositConfig as Prisma.InputJsonValue;
    }
    if (dto.intakeFormConfig !== undefined) {
      data.intakeFormConfig = dto.intakeFormConfig as Prisma.InputJsonValue;
    }
    if (dto.cancellationPolicy !== undefined) {
      data.cancellationPolicy = dto.cancellationPolicy as Prisma.InputJsonValue;
    }

    const result = await this.prisma.service.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true },
        },
        venue: {
          select: { id: true, name: true },
        },
      },
    });

    this.redis.del(`services:list:${tenantId}`, `service:${tenantId}:${id}`).catch(() => {});

    return result;
  }

  /**
   * Soft-delete a service (set isActive = false).
   */
  async remove(tenantId: string, id: string) {
    // Verify the service exists and belongs to this tenant
    await this.findById(tenantId, id);

    await this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    this.redis.del(`services:list:${tenantId}`, `service:${tenantId}:${id}`).catch(() => {});

    return { message: 'Service deactivated successfully' };
  }

  /**
   * Get the preference template for a service.
   */
  async getPreferenceTemplate(tenantId: string, serviceId: string) {
    const service = await this.findById(tenantId, serviceId);
    return {
      serviceId: service.id,
      template: service.preferenceTemplate ?? null,
    };
  }

  /**
   * Set or update the preference template for a service.
   */
  async setPreferenceTemplate(
    tenantId: string,
    serviceId: string,
    template: Record<string, unknown>,
  ) {
    await this.findById(tenantId, serviceId);

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        preferenceTemplate: template as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        preferenceTemplate: true,
      },
    });

    this.redis.del(`services:list:${tenantId}`, `service:${tenantId}:${serviceId}`).catch(() => {});

    return {
      serviceId: updated.id,
      template: updated.preferenceTemplate,
    };
  }

  /**
   * Copy a service, creating a duplicate with " (Copy)" appended to the name.
   */
  async copy(tenantId: string, id: string) {
    const original = await this.findById(tenantId, id);

    // Determine the next sort order
    const maxSort = await this.prisma.service.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const result = await this.prisma.service.create({
      data: {
        tenantId,
        name: `${original.name} (Copy)`,
        description: original.description,
        durationMinutes: original.durationMinutes,
        basePrice: original.basePrice,
        currency: original.currency,
        pricingModel: original.pricingModel,
        confirmationMode: original.confirmationMode,
        categoryId: original.categoryId,
        venueId: original.venueId,
        bufferBeforeMinutes: original.bufferBeforeMinutes,
        bufferAfterMinutes: original.bufferAfterMinutes,
        autoCancelOnOverdue: original.autoCancelOnOverdue,
        maxRescheduleCount: original.maxRescheduleCount,
        noShowGraceMinutes: original.noShowGraceMinutes,
        approvalDeadlineHours: original.approvalDeadlineHours,
        contractTemplateId: original.contractTemplateId,
        guestConfig: original.guestConfig
          ? (original.guestConfig as Prisma.InputJsonValue)
          : undefined,
        tierConfig: original.tierConfig
          ? (original.tierConfig as Prisma.InputJsonValue)
          : undefined,
        depositConfig: original.depositConfig
          ? (original.depositConfig as Prisma.InputJsonValue)
          : undefined,
        intakeFormConfig: original.intakeFormConfig
          ? (original.intakeFormConfig as Prisma.InputJsonValue)
          : undefined,
        cancellationPolicy: original.cancellationPolicy
          ? (original.cancellationPolicy as Prisma.InputJsonValue)
          : undefined,
        sortOrder: nextSortOrder,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        venue: {
          select: { id: true, name: true },
        },
      },
    });

    this.redis.del(`services:list:${tenantId}`).catch(() => {});

    return result;
  }
}
