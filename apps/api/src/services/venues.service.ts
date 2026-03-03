import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all active venues for a tenant.
   */
  async findAll(tenantId: string) {
    return this.prisma.venue.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single venue by ID within a tenant.
   */
  async findById(tenantId: string, id: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { id, tenantId },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  /**
   * Create a new venue.
   */
  async create(tenantId: string, dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        address: dto.address
          ? (dto.address as Prisma.InputJsonValue)
          : undefined,
        capacity: dto.capacity,
        images: dto.images
          ? (dto.images as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  /**
   * Update a venue.
   */
  async update(tenantId: string, id: string, dto: UpdateVenueDto) {
    await this.findById(tenantId, id);

    const data: Prisma.VenueUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.address !== undefined) {
      data.address = dto.address as Prisma.InputJsonValue;
    }
    if (dto.images !== undefined) {
      data.images = dto.images as Prisma.InputJsonValue;
    }

    return this.prisma.venue.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft-delete a venue (set isActive = false).
   */
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.prisma.venue.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Venue deactivated successfully' };
  }
}
