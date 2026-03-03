import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlockedDateDto } from './dto/create-blocked-date.dto';

@Injectable()
export class BlockedDatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all blocked dates for a tenant, optionally filtered by service and venue.
   */
  async findAll(tenantId: string, serviceId?: string, venueId?: string) {
    return this.prisma.blockedDate.findMany({
      where: {
        tenantId,
        ...(serviceId ? { serviceId } : {}),
        ...(venueId ? { venueId } : {}),
      },
      orderBy: { blockedDate: 'asc' },
    });
  }

  /**
   * Create a new blocked date.
   */
  async create(tenantId: string, userId: string, dto: CreateBlockedDateDto) {
    return this.prisma.blockedDate.create({
      data: {
        tenantId,
        blockedDate: new Date(dto.blockedDate),
        reason: dto.reason ?? null,
        serviceId: dto.serviceId ?? null,
        venueId: dto.venueId ?? null,
        createdBy: userId,
      },
    });
  }

  /**
   * Delete a blocked date.
   */
  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.blockedDate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Blocked date not found');
    }

    await this.prisma.blockedDate.delete({
      where: { id },
    });

    return { message: 'Blocked date deleted successfully' };
  }
}
