import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryPhotoDto } from './dto/create-gallery-photo.dto';
import { UpdateGalleryPhotoDto } from './dto/update-gallery-photo.dto';

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    filters?: { venueId?: string; serviceId?: string; category?: string },
  ) {
    return this.prisma.galleryPhoto.findMany({
      where: {
        tenantId,
        ...(filters?.venueId && { venueId: filters.venueId }),
        ...(filters?.serviceId && { serviceId: filters.serviceId }),
        ...(filters?.category && { category: filters.category }),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateGalleryPhotoDto) {
    const photo = await this.prisma.galleryPhoto.create({
      data: {
        tenantId,
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        altText: dto.altText ?? null,
        caption: dto.caption ?? null,
        category: dto.category ?? null,
        venueId: dto.venueId ?? null,
        serviceId: dto.serviceId ?? null,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        width: dto.width ?? null,
        height: dto.height ?? null,
        fileSize: dto.fileSize ?? null,
      },
    });

    this.logger.log(`Gallery photo ${photo.id} created for tenant ${tenantId}`);
    return photo;
  }

  async update(tenantId: string, id: string, dto: UpdateGalleryPhotoDto) {
    const existing = await this.prisma.galleryPhoto.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Gallery photo not found');
    }

    return this.prisma.galleryPhoto.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.galleryPhoto.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Gallery photo not found');
    }

    await this.prisma.galleryPhoto.delete({ where: { id } });
    this.logger.log(`Gallery photo ${id} deleted from tenant ${tenantId}`);
  }
}
