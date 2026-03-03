import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all service categories for a tenant.
   */
  async findAll(tenantId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get a single category by ID within a tenant.
   */
  async findById(tenantId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Service category not found');
    }

    return category;
  }

  /**
   * Create a new service category.
   */
  async create(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Update a service category.
   */
  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.findById(tenantId, id);

    return this.prisma.serviceCategory.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a service category.
   */
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.prisma.serviceCategory.delete({
      where: { id },
    });

    return { message: 'Service category deleted successfully' };
  }
}
