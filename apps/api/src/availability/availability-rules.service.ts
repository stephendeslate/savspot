import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class AvailabilityRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convert an "HH:mm" string to a Date object (1970-01-01).
   * Prisma @db.Time() fields are mapped to Date objects.
   */
  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(1970, 0, 1, hours, minutes, 0, 0);
  }

  /**
   * List all availability rules for a tenant, optionally filtered by service and venue.
   */
  async findAll(tenantId: string, serviceId?: string, venueId?: string) {
    return this.prisma.availabilityRule.findMany({
      where: {
        tenantId,
        ...(serviceId ? { serviceId } : {}),
        ...(venueId ? { venueId } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Create a new availability rule.
   */
  async create(tenantId: string, dto: CreateRuleDto) {
    return this.prisma.availabilityRule.create({
      data: {
        tenantId,
        dayOfWeek: dto.dayOfWeek,
        startTime: this.parseTime(dto.startTime),
        endTime: this.parseTime(dto.endTime),
        serviceId: dto.serviceId ?? null,
        venueId: dto.venueId ?? null,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  /**
   * Update an existing availability rule.
   */
  async update(tenantId: string, id: string, dto: UpdateRuleDto) {
    const existing = await this.prisma.availabilityRule.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Availability rule not found');
    }

    return this.prisma.availabilityRule.update({
      where: { id },
      data: {
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
        ...(dto.startTime !== undefined ? { startTime: this.parseTime(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: this.parseTime(dto.endTime) } : {}),
        ...(dto.serviceId !== undefined ? { serviceId: dto.serviceId } : {}),
        ...(dto.venueId !== undefined ? { venueId: dto.venueId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  /**
   * Delete an availability rule.
   */
  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.availabilityRule.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Availability rule not found');
    }

    await this.prisma.availabilityRule.delete({
      where: { id },
    });

    return { message: 'Availability rule deleted successfully' };
  }
}
