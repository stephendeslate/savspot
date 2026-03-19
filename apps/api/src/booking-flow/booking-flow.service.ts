import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateBookingFlowDto } from './dto/update-booking-flow.dto';

export interface StepResolution {
  type: string;
  label: string;
  active: boolean;
  reason?: string;
}

interface ServiceForStepResolution {
  venueId: string | null;
  guestConfig: unknown;
  intakeFormConfig: unknown;
  _count: { serviceAddons: number; serviceProviders: number };
}

@Injectable()
export class BookingFlowService {
  private readonly logger = new Logger(BookingFlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getBookingFlow(tenantId: string) {
    const flow = await this.prisma.bookingFlow.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!flow) {
      // Try any flow for the tenant
      const anyFlow = await this.prisma.bookingFlow.findFirst({
        where: { tenantId },
      });
      if (!anyFlow) {
        throw new NotFoundException('No booking flow configured for this tenant');
      }
      return this.resolveFlowWithSteps(tenantId, anyFlow);
    }

    return this.resolveFlowWithSteps(tenantId, flow);
  }

  async updateBookingFlow(tenantId: string, dto: UpdateBookingFlowDto) {
    const flow = await this.prisma.bookingFlow.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!flow) {
      throw new NotFoundException('No booking flow configured for this tenant');
    }

    const updated = await this.prisma.bookingFlow.update({
      where: { id: flow.id },
      data: {
        ...(dto.stepOverrides !== undefined && { stepOverrides: dto.stepOverrides as object }),
        ...(dto.settings !== undefined && { settings: dto.settings as object }),
        ...(dto.minBookingAdvanceDays !== undefined && { minBookingAdvanceDays: dto.minBookingAdvanceDays }),
        ...(dto.maxBookingAdvanceDays !== undefined && { maxBookingAdvanceDays: dto.maxBookingAdvanceDays }),
      },
    });

    await this.redis.del(`booking:flow:${tenantId}`).catch(() => {});
    this.logger.log(`Booking flow ${updated.id} updated for tenant ${tenantId}`);
    return updated;
  }

  private async resolveFlowWithSteps(
    tenantId: string,
    flow: {
      id: string;
      tenantId: string;
      name: string;
      isDefault: boolean;
      stepOverrides: unknown;
      settings: unknown;
      minBookingAdvanceDays: number;
      maxBookingAdvanceDays: number;
      createdAt: Date;
    },
  ) {
    // Fetch all active services to determine which steps are needed
    const services = await this.prisma.service.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        venueId: true,
        guestConfig: true,
        intakeFormConfig: true,
        basePrice: true,
        _count: {
          select: {
            serviceAddons: { where: { isActive: true } },
            serviceProviders: true,
          },
        },
      },
    });

    const venueCount = await this.prisma.venue.count({
      where: { tenantId, isActive: true },
    });

    // Resolve steps for each service
    const serviceSteps = services.map((service) => ({
      serviceId: service.id,
      serviceName: service.name,
      steps: this.resolveStepsForService(service, services.length, venueCount),
    }));

    // Global step resolution (across all services)
    const globalSteps = this.resolveGlobalSteps(services, venueCount);

    return {
      ...flow,
      globalSteps,
      serviceSteps,
    };
  }

  private resolveGlobalSteps(
    services: ServiceForStepResolution[],
    venueCount: number,
  ): StepResolution[] {
    const steps: StepResolution[] = [];

    steps.push({
      type: 'SERVICE_SELECTION',
      label: 'Select Service',
      active: services.length > 1,
      reason: services.length > 1 ? `${services.length} active services` : 'Only one service',
    });

    const hasMultipleProviders = services.some((s) => s._count.serviceProviders > 1);
    steps.push({
      type: 'STAFF_SELECTION',
      label: 'Choose Staff',
      active: hasMultipleProviders,
      reason: hasMultipleProviders
        ? 'At least one service has multiple providers'
        : 'No services have multiple providers',
    });

    steps.push({
      type: 'VENUE_SELECTION',
      label: 'Select Venue',
      active: venueCount > 0,
      reason: venueCount > 0 ? `${venueCount} active venue(s)` : 'No venues configured',
    });

    steps.push({
      type: 'GUEST_COUNT',
      label: 'Guest Count',
      active: services.some((s) => !!s.guestConfig),
      reason: services.some((s) => !!s.guestConfig)
        ? 'At least one service has guest config'
        : 'No services have guest config',
    });

    steps.push({
      type: 'QUESTIONNAIRE',
      label: 'Questionnaire',
      active: services.some((s) => !!s.intakeFormConfig),
      reason: services.some((s) => !!s.intakeFormConfig)
        ? 'At least one service has intake form'
        : 'No services have intake forms',
    });

    steps.push({
      type: 'ADD_ONS',
      label: 'Add-ons',
      active: services.some((s) => s._count.serviceAddons > 0),
      reason: services.some((s) => s._count.serviceAddons > 0)
        ? 'At least one service has add-ons'
        : 'No services have add-ons',
    });

    steps.push({ type: 'DATE_TIME_PICKER', label: 'Select Date & Time', active: true });
    steps.push({ type: 'CLIENT_INFO', label: 'Contact Information', active: true });
    steps.push({ type: 'PRICING_SUMMARY', label: 'Pricing Summary', active: true });
    steps.push({ type: 'PAYMENT', label: 'Payment', active: true, reason: 'If payment required' });
    steps.push({ type: 'CONFIRMATION', label: 'Confirmation', active: true });

    return steps;
  }

  private resolveStepsForService(
    service: ServiceForStepResolution,
    totalServices: number,
    venueCount: number,
  ): StepResolution[] {
    const steps: StepResolution[] = [];

    if (totalServices > 1) {
      steps.push({ type: 'SERVICE_SELECTION', label: 'Select Service', active: true });
    }
    if (service._count.serviceProviders > 1) {
      steps.push({ type: 'STAFF_SELECTION', label: 'Choose Staff', active: true });
    }
    if (service.venueId || venueCount > 0) {
      steps.push({ type: 'VENUE_SELECTION', label: 'Select Venue', active: true });
    }
    if (service.guestConfig) {
      steps.push({ type: 'GUEST_COUNT', label: 'Guest Count', active: true });
    }
    if (service.intakeFormConfig) {
      steps.push({ type: 'QUESTIONNAIRE', label: 'Questionnaire', active: true });
    }
    if (service._count.serviceAddons > 0) {
      steps.push({ type: 'ADD_ONS', label: 'Add-ons', active: true });
    }

    steps.push({ type: 'DATE_TIME_PICKER', label: 'Select Date & Time', active: true });
    steps.push({ type: 'CLIENT_INFO', label: 'Contact Information', active: true });
    steps.push({ type: 'PRICING_SUMMARY', label: 'Pricing Summary', active: true });
    steps.push({ type: 'PAYMENT', label: 'Payment', active: true });
    steps.push({ type: 'CONFIRMATION', label: 'Confirmation', active: true });

    return steps;
  }
}
