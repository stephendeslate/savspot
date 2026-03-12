import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const SENSITIVE_FIELDS = ['passwordHash', 'mfaSecret', 'mfaRecoveryCodes'] as const;

function sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'passwordHash' | 'mfaSecret' | 'mfaRecoveryCodes'> {
  const result = { ...user };
  for (const field of SENSITIVE_FIELDS) {
    delete (result as Record<string, unknown>)[field];
  }
  return result as Omit<T, 'passwordHash' | 'mfaSecret' | 'mfaRecoveryCodes'>;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          select: {
            tenantId: true,
            role: true,
            tenant: {
              select: { id: true, name: true, slug: true, logoUrl: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return sanitizeUser(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    return sanitizeUser(user);
  }

  async getNotificationPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    return pref ?? { preferences: null };
  }

  async updateNotificationPreferences(userId: string, preferences: Record<string, unknown>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        preferences: preferences as object,
      },
      update: {
        preferences: preferences as object,
      },
    });
  }
}
