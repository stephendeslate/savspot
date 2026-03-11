import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceAddonDto } from './dto/create-service-addon.dto';
import { UpdateServiceAddonDto } from './dto/update-service-addon.dto';

@Injectable()
export class ServiceAddonsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all active add-ons for a service, sorted by sortOrder.
   */
  async listAddons(tenantId: string, serviceId: string) {
    await this.ensureServiceExists(tenantId, serviceId);

    return this.prisma.serviceAddon.findMany({
      where: { tenantId, serviceId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Create a new add-on for a service.
   */
  async createAddon(
    tenantId: string,
    serviceId: string,
    dto: CreateServiceAddonDto,
  ) {
    await this.ensureServiceExists(tenantId, serviceId);

    return this.prisma.serviceAddon.create({
      data: {
        tenantId,
        serviceId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Update an existing add-on.
   */
  async updateAddon(
    tenantId: string,
    serviceId: string,
    addonId: string,
    dto: UpdateServiceAddonDto,
  ) {
    await this.ensureAddonExists(tenantId, serviceId, addonId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.price !== undefined) data['price'] = dto.price;
    if (dto.isRequired !== undefined) data['isRequired'] = dto.isRequired;
    if (dto.sortOrder !== undefined) data['sortOrder'] = dto.sortOrder;

    return this.prisma.serviceAddon.update({
      where: { id: addonId },
      data,
    });
  }

  /**
   * Soft-delete an add-on by setting isActive=false.
   */
  async deleteAddon(tenantId: string, serviceId: string, addonId: string) {
    await this.ensureAddonExists(tenantId, serviceId, addonId);

    await this.prisma.serviceAddon.update({
      where: { id: addonId },
      data: { isActive: false },
    });

    return { message: 'Add-on deactivated successfully' };
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

  private async ensureAddonExists(
    tenantId: string,
    serviceId: string,
    addonId: string,
  ) {
    const addon = await this.prisma.serviceAddon.findFirst({
      where: { id: addonId, tenantId, serviceId },
    });

    if (!addon) {
      throw new NotFoundException('Service add-on not found');
    }

    return addon;
  }
}
