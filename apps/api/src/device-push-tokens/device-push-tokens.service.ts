import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDevicePushTokenDto } from './dto/create-device-push-token.dto';
import { UpdateDevicePushTokenDto } from './dto/update-device-push-token.dto';

@Injectable()
export class DevicePushTokensService {
  private readonly logger = new Logger(DevicePushTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: CreateDevicePushTokenDto) {
    const token = await this.prisma.devicePushToken.upsert({
      where: { token: dto.token },
      update: {
        userId,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName ?? null,
        isActive: true,
        failureCount: 0,
      },
      create: {
        userId,
        token: dto.token,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName ?? null,
      },
    });

    this.logger.log(`Push token registered for user ${userId}: ${token.id}`);

    return token;
  }

  async update(id: string, userId: string, dto: UpdateDevicePushTokenDto) {
    const existing = await this.prisma.devicePushToken.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Device push token not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException("Cannot update another user's push token");
    }

    const updated = await this.prisma.devicePushToken.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Push token ${id} updated by user ${userId}`);

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.devicePushToken.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Device push token not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException("Cannot delete another user's push token");
    }

    await this.prisma.devicePushToken.delete({
      where: { id },
    });

    this.logger.log(`Push token ${id} deleted by user ${userId}`);

    return { deleted: true };
  }
}
