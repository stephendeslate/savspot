import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedBusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleSave(userId: string, tenantId: string) {
    const existing = await this.prisma.savedBusiness.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (existing) {
      await this.prisma.savedBusiness.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await this.prisma.savedBusiness.create({ data: { userId, tenantId } });
    return { saved: true };
  }

  async listSaved(userId: string) {
    return this.prisma.savedBusiness.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            logoUrl: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
