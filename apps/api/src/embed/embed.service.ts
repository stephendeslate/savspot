import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingSource } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateEmbedSessionDto } from './dto/create-embed-session.dto';

@Injectable()
export class EmbedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async getWidgetConfig(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        category: true,
        subscriptionTier: true,
        status: true,
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    const allowedModes: string[] = ['button'];
    if (tenant.subscriptionTier === 'PRO') {
      allowedModes.push('popup', 'inline');
    }

    return {
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.brandColor,
      businessType: tenant.category,
      subscriptionTier: tenant.subscriptionTier,
      allowedModes,
    };
  }

  async getAvailableServices(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, TRUE)`;

      return tx.service.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          basePrice: true,
          currency: true,
          images: true,
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  async getAvailability(slug: string, serviceId: string, date: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    return this.availabilityService.getAvailableSlots({
      tenantId: tenant.id,
      serviceId,
      startDate: date,
      endDate: date,
    });
  }

  async createBookingSession(slug: string, dto: CreateEmbedSessionDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    const service = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, TRUE)`;

      return tx.service.findFirst({
        where: { id: dto.serviceId, tenantId: tenant.id, isActive: true },
        select: { id: true, name: true },
      });
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const source = dto.source ?? 'WIDGET';

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, TRUE)`;

      return tx.bookingSession.create({
        data: {
          tenantId: tenant.id,
          serviceId: dto.serviceId,
          source: source as BookingSource,
          status: 'IN_PROGRESS',
          currentStep: 0,
          resolvedSteps: [],
          data: {
            clientEmail: dto.clientEmail,
            clientName: dto.clientName,
            source,
          },
        },
        select: {
          id: true,
          serviceId: true,
          status: true,
          createdAt: true,
        },
      });
    });

    return session;
  }
}
