import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicBookingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a tenant's public profile and active services by slug.
   * Used for the public booking widget.
   */
  async getTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        coverPhotoUrl: true,
        brandColor: true,
        timezone: true,
        currency: true,
        country: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        category: true,
        status: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            basePrice: true,
            currency: true,
            pricingModel: true,
            images: true,
            guestConfig: true,
            categoryId: true,
            category: {
              select: { id: true, name: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    // Remove status from the public response
    const { status: _, ...publicTenant } = tenant; // eslint-disable-line @typescript-eslint/no-unused-vars
    return publicTenant;
  }

  /**
   * Get a specific service detail with availability rules for a tenant.
   * Used to display the booking flow for a selected service.
   */
  async getServiceDetail(slug: string, serviceId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        currency: true,
        status: true,
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        basePrice: true,
        currency: true,
        pricingModel: true,
        images: true,
        guestConfig: true,
        depositConfig: true,
        intakeFormConfig: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        cancellationPolicy: true,
        confirmationMode: true,
        venue: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        availabilityRules: {
          where: { isActive: true },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Also load tenant-wide availability rules (for days without service rules)
    const tenantWideRules = await this.prisma.availabilityRule.findMany({
      where: {
        tenantId: tenant.id,
        serviceId: null,
        isActive: true,
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        currency: tenant.currency,
      },
      service,
      tenantWideAvailability: tenantWideRules,
    };
  }
}
