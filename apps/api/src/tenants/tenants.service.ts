import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  QUEUE_GDPR,
  JOB_PROCESS_DATA_EXPORT,
  JOB_PROCESS_ACCOUNT_DELETION,
} from '../bullmq/queue.constants';

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
    @InjectQueue(QUEUE_GDPR) private readonly gdprQueue: Queue,
  ) {}

  /**
   * Create a new tenant and assign the creating user as OWNER.
   */
  async create(userId: string, dto: CreateTenantDto) {
    const slug = await this.slugService.generateSlug(dto.name);
    const tenantId = randomUUID();

    // Use an interactive transaction to set the RLS context before inserting
    // and to prevent TOCTOU races on the ownership check.
    const tenant = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      // Prevent duplicate tenants — a user can only own one tenant.
      // Check inside transaction to avoid race conditions.
      const existingOwnership = await tx.tenantMembership.findFirst({
        where: { userId, role: 'OWNER' },
      });
      if (existingOwnership) {
        throw new ConflictException('You already own a business. Use the dashboard to manage it.');
      }

      return tx.tenant.create({
        data: {
          id: tenantId,
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
    });

    this.logger.log(
      `Tenant created: ${tenant.id} (${tenant.slug}) by user ${userId}`,
    );
    this.logger.log(
      `[telemetry] category_selected: ${dto.category} tenant=${tenant.id}`,
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
          (svc: { name: string; duration_minutes: number; base_price: number }, index: number) =>
            tx.service.create({
              data: {
                tenantId,
                name: svc.name,
                durationMinutes: svc.duration_minutes,
                basePrice: svc.base_price,
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

  /**
   * Request a business data export for a tenant.
   * Creates a DataRequest and enqueues a background job.
   */
  async requestExport(tenantId: string, userId: string) {
    await this.findById(tenantId);

    const now = new Date();
    const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const dataRequest = await this.prisma.dataRequest.create({
      data: {
        userId,
        requestType: 'EXPORT',
        status: 'PENDING',
        requestedAt: now,
        deadlineAt: deadline,
        notes: `Tenant export for ${tenantId}`,
      },
    });

    await this.gdprQueue.add(
      JOB_PROCESS_DATA_EXPORT,
      { dataRequestId: dataRequest.id, userId, tenantId, type: 'TENANT_EXPORT' },
      { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
    );

    this.logger.log(`Tenant export requested: ${dataRequest.id} for tenant ${tenantId}`);

    return dataRequest;
  }

  /**
   * Deactivate a tenant with a 30-day grace period before data deletion.
   * Sets tenant status to DEACTIVATED, triggers a data export, and
   * schedules a deletion job after the grace period.
   */
  async deactivate(tenantId: string, userId: string) {
    const tenant = await this.findById(tenantId);

    if (tenant.status === 'DEACTIVATED') {
      throw new ConflictException('Tenant is already deactivated');
    }

    const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'DEACTIVATED' },
    });

    this.logger.log(`Tenant ${tenantId} deactivated by user ${userId}`);

    // Trigger a data export so the owner can download their data during the grace period
    const now = new Date();
    const exportDeadline = new Date(now.getTime() + GRACE_PERIOD_MS);

    const dataRequest = await this.prisma.dataRequest.create({
      data: {
        userId,
        requestType: 'EXPORT',
        status: 'PENDING',
        requestedAt: now,
        deadlineAt: exportDeadline,
        notes: `Deactivation export for tenant ${tenantId}`,
      },
    });

    await this.gdprQueue.add(
      JOB_PROCESS_DATA_EXPORT,
      { dataRequestId: dataRequest.id, userId, tenantId, type: 'DEACTIVATION_EXPORT' },
      { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
    );

    // Schedule data deletion after the 30-day grace period
    await this.gdprQueue.add(
      JOB_PROCESS_ACCOUNT_DELETION,
      { tenantId, userId, reason: 'TENANT_DEACTIVATION' },
      {
        delay: GRACE_PERIOD_MS,
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    );

    this.logger.log(
      `Scheduled data deletion for tenant ${tenantId} after 30-day grace period`,
    );

    return {
      tenantId,
      status: 'DEACTIVATED',
      exportRequestId: dataRequest.id,
      deletionScheduledAt: new Date(now.getTime() + GRACE_PERIOD_MS).toISOString(),
    };
  }
}
