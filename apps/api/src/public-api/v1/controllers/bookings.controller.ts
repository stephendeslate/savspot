import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { Public } from '../../../common/decorators/public.decorator';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe';
import { PublicApiKeyGuard } from '../guards/api-key.guard';
import { ApiVersionInterceptor } from '../interceptors/api-version.interceptor';
import { ApiKeyScopes } from '../../decorators/api-key-scopes.decorator';
import { BookingsService } from '../../../bookings/bookings.service';
import { transformBooking } from '../transformers/booking.transformer';
import { ValidatedApiKey } from '../../services/api-key.service';

@ApiTags('Public API - Bookings')
@Public()
@UseGuards(PublicApiKeyGuard)
@UseInterceptors(ApiVersionInterceptor)
@Controller('api/v1/bookings')
export class BookingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get(':id')
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  @ApiKeyScopes('bookings:read')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBooking(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: Request,
  ) {
    const apiKey = this.extractApiKey(req);

    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: apiKey.tenantId },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        totalAmount: true,
        currency: true,
        guestCount: true,
        service: {
          select: { name: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      data: transformBooking(booking),
    };
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiKeyScopes('bookings:write')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 400, description: 'Booking cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: Request,
  ) {
    const apiKey = this.extractApiKey(req);

    const result = await this.bookingsService.cancel(
      apiKey.tenantId,
      id,
      apiKey.createdBy,
      'Cancelled via Public API',
    );

    return {
      data: {
        id: result.id,
        status: result.status,
        cancelled_at: result.cancelledAt?.toISOString() ?? null,
      },
    };
  }

  private extractApiKey(req: Request): ValidatedApiKey {
    const apiKey = (req as unknown as Record<string, unknown>)['apiKey'] as ValidatedApiKey | undefined;

    if (!apiKey) {
      throw new BadRequestException('API key context is required');
    }

    return apiKey;
  }
}
