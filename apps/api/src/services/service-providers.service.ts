import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all providers assigned to a service.
   */
  async listProviders(tenantId: string, serviceId: string) {
    await this.ensureServiceExists(tenantId, serviceId);

    return this.prisma.serviceProvider.findMany({
      where: { tenantId, serviceId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Assign a provider (user) to a service.
   */
  async assignProvider(tenantId: string, serviceId: string, userId: string) {
    await this.ensureServiceExists(tenantId, serviceId);

    // Check if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already assigned
    const existing = await this.prisma.serviceProvider.findUnique({
      where: { serviceId_userId: { serviceId, userId } },
    });

    if (existing) {
      throw new ConflictException('Provider is already assigned to this service');
    }

    return this.prisma.serviceProvider.create({
      data: {
        serviceId,
        userId,
        tenantId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Unassign a provider from a service.
   */
  async unassignProvider(tenantId: string, serviceId: string, userId: string) {
    await this.ensureServiceExists(tenantId, serviceId);

    const existing = await this.prisma.serviceProvider.findUnique({
      where: { serviceId_userId: { serviceId, userId } },
    });

    if (!existing) {
      throw new NotFoundException('Provider assignment not found');
    }

    await this.prisma.serviceProvider.delete({
      where: { serviceId_userId: { serviceId, userId } },
    });

    return { message: 'Provider unassigned successfully' };
  }

  private async ensureServiceExists(tenantId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }
}
