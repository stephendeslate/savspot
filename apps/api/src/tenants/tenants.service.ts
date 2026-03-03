import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

/**
 * BusinessCategory type mirrored from @savspot/shared.
 * The shared package is ESM-only; the API is CJS. We define the type
 * locally and use dynamic import for the runtime value.
 */
type BusinessCategory =
  | 'VENUE'
  | 'SALON'
  | 'STUDIO'
  | 'FITNESS'
  | 'PROFESSIONAL'
  | 'OTHER';

/**
 * Parse an "HH:mm" time string into a Date with only the time portion set.
 * Prisma maps @db.Time() to a Date object with a fixed date (1970-01-01).
 */
function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return date;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
  ) {}

  /**
   * Create a new tenant and assign the creating user as OWNER.
   */
  async create(userId: string, dto: CreateTenantDto) {
    const slug = await this.slugService.generateSlug(dto.name);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        category: dto.category as BusinessCategory,
        timezone: dto.timezone,
        currency: dto.currency,
        country: dto.country,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        address: dto.address
          ? (dto.address as Prisma.InputJsonValue)
          : undefined,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        memberships: {
          select: {
            id: true,
            userId: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(
      `Tenant created: ${tenant.id} (${tenant.slug}) by user ${userId}`,
    );

    return tenant;
  }

  /**
   * Find a tenant by ID.
   */
  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    return tenant;
  }

  /**
   * Update tenant fields.
   */
  async update(id: string, dto: UpdateTenantDto) {
    // Verify tenant exists
    await this.findById(id);

    const data: Prisma.TenantUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryDescription !== undefined) data.categoryDescription = dto.categoryDescription;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.coverPhotoUrl !== undefined) data.coverPhotoUrl = dto.coverPhotoUrl;
    if (dto.brandColor !== undefined) data.brandColor = dto.brandColor;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.address !== undefined) {
      data.address = dto.address as Prisma.InputJsonValue;
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data,
    });

    return tenant;
  }

  /**
   * Apply a business preset to a tenant.
   *
   * Creates default services, availability rules, and workflow automations
   * based on the chosen business category preset.
   *
   * Idempotent: skips creation if any services already exist for this tenant.
   */
  async applyPreset(tenantId: string, category: string) {
    // Verify tenant exists
    const tenant = await this.findById(tenantId);

    // Idempotent check -- skip if the tenant already has services
    const existingServices = await this.prisma.service.count({
      where: { tenantId },
    });

    if (existingServices > 0) {
      throw new ConflictException(
        'Preset already applied. This tenant already has services configured.',
      );
    }

    const { BUSINESS_PRESETS } = await import('@savspot/shared');
    const preset = BUSINESS_PRESETS[category as BusinessCategory];

    if (!preset) {
      throw new NotFoundException(`No preset found for category: ${category}`);
    }

    // Use a transaction to create all preset data atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Create default services
      const services = await Promise.all(
        preset.default_services.map(
          (svc: { name: string; duration_minutes: number; base_price_cents: number }, index: number) =>
            tx.service.create({
              data: {
                tenantId,
                name: svc.name,
                durationMinutes: svc.duration_minutes,
                basePrice: svc.base_price_cents / 100,
                currency: tenant.currency,
                sortOrder: index,
              },
            }),
        ),
      );

      // Create default availability rules
      const availabilityRules = await Promise.all(
        preset.default_availability.map(
          (rule: { day_of_week: number; start_time: string; end_time: string }) =>
            tx.availabilityRule.create({
              data: {
                tenantId,
                dayOfWeek: rule.day_of_week,
                startTime: parseTimeToDate(rule.start_time),
                endTime: parseTimeToDate(rule.end_time),
                isActive: true,
              },
            }),
        ),
      );

      // Create default workflow automations
      const workflows = await Promise.all(
        preset.default_workflows.map(
          (wf: { trigger: string; action: string; delay_minutes: number; description: string }) =>
            tx.workflowAutomation.create({
              data: {
                tenantId,
                triggerEvent: wf.trigger as
                  | 'BOOKING_CREATED'
                  | 'BOOKING_CONFIRMED'
                  | 'BOOKING_CANCELLED'
                  | 'BOOKING_RESCHEDULED'
                  | 'BOOKING_COMPLETED'
                  | 'PAYMENT_RECEIVED'
                  | 'REMINDER_DUE'
                  | 'PAYMENT_OVERDUE'
                  | 'CONTRACT_SIGNED'
                  | 'CONTRACT_EXPIRED'
                  | 'QUOTE_ACCEPTED'
                  | 'QUOTE_REJECTED'
                  | 'QUOTE_EXPIRED'
                  | 'REVIEW_SUBMITTED'
                  | 'CLIENT_REGISTERED'
                  | 'BOOKING_NO_SHOW'
                  | 'BOOKING_WALK_IN'
                  | 'INVOICE_OVERDUE',
                actionType: wf.action as
                  | 'SEND_EMAIL'
                  | 'SEND_SMS'
                  | 'SEND_PUSH'
                  | 'SEND_NOTIFICATION',
                actionConfig: {
                  description: wf.description,
                  delayMinutes: wf.delay_minutes,
                } as Prisma.InputJsonValue,
                isActive: true,
              },
            }),
        ),
      );

      return {
        servicesCreated: services.length,
        availabilityRulesCreated: availabilityRules.length,
        workflowsCreated: workflows.length,
      };
    });

    this.logger.log(
      `Preset "${category}" applied to tenant ${tenantId}: ` +
        `${result.servicesCreated} services, ` +
        `${result.availabilityRulesCreated} availability rules, ` +
        `${result.workflowsCreated} workflows`,
    );

    return result;
  }
}
