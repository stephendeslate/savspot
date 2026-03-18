import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe';
import { PublicApiKeyGuard } from '../guards/api-key.guard';
import { ApiVersionInterceptor } from '../interceptors/api-version.interceptor';
import { ApiKeyScopes } from '../../decorators/api-key-scopes.decorator';
import { CreateBookingSessionDto } from '../dto/create-booking-session.dto';
import { UpdateBookingSessionDto } from '../dto/update-booking-session.dto';
import { BookingSessionsService } from '../../../booking-sessions/booking-sessions.service';
import { ValidatedApiKey } from '../../services/api-key.service';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Public API - Booking Sessions')
@Public()
@UseGuards(PublicApiKeyGuard)
@UseInterceptors(ApiVersionInterceptor)

@RequiresLicense()
@Controller('api/v1/booking-sessions')
export class BookingSessionsController {
  constructor(
    private readonly bookingSessionsService: BookingSessionsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiKeyScopes('bookings:write')
  @ApiOperation({ summary: 'Create a new booking session' })
  @ApiResponse({ status: 201, description: 'Booking session created' })
  async createSession(
    @Body() dto: CreateBookingSessionDto,
    @Req() req: Request,
  ) {
    const apiKey = this.extractApiKey(req);

    const session = await this.bookingSessionsService.create(apiKey.tenantId, {
      tenantId: apiKey.tenantId,
      serviceId: dto.service_id,
      source: 'API',
    });

    return {
      data: {
        id: session.id,
        status: session.status,
        current_step: session.currentStep,
        resolved_steps: session.resolvedSteps,
        service: session.service
          ? {
              id: session.service.id,
              name: session.service.name,
            }
          : null,
        created_at: session.createdAt.toISOString(),
      },
    };
  }

  @Get(':id')
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  @ApiKeyScopes('bookings:write')
  @ApiOperation({ summary: 'Get booking session state' })
  @ApiResponse({ status: 200, description: 'Booking session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: Request,
  ) {
    const apiKey = this.extractApiKey(req);

    const session = await this.bookingSessionsService.findById(apiKey.tenantId, id);

    return {
      data: {
        id: session.id,
        status: session.status,
        current_step: session.currentStep,
        resolved_steps: session.resolvedSteps,
        data: session.data,
        service: session.service
          ? {
              id: session.service.id,
              name: session.service.name,
            }
          : null,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
      },
    };
  }

  @Patch(':id')
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  @ApiKeyScopes('bookings:write')
  @ApiOperation({ summary: 'Update booking session fields for current step' })
  @ApiResponse({ status: 200, description: 'Booking session updated' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSession(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateBookingSessionDto,
    @Req() req: Request,
  ) {
    const apiKey = this.extractApiKey(req);

    const session = await this.bookingSessionsService.update(apiKey.tenantId, id, {
      data: dto.fields,
    });

    return {
      data: {
        id: session.id,
        status: session.status,
        current_step: session.currentStep,
        resolved_steps: session.resolvedSteps,
        data: session.data,
        service: session.service
          ? {
              id: session.service.id,
              name: session.service.name,
            }
          : null,
        updated_at: session.updatedAt.toISOString(),
      },
    };
  }

  @Post(':id/complete')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiKeyScopes('bookings:write')
  @ApiOperation({ summary: 'Complete booking session and create booking' })
  @ApiResponse({ status: 200, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Session cannot be completed' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async completeSession(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: Request,
  ) {
    const apiKey = this.extractApiKey(req);

    const booking = await this.bookingSessionsService.complete(apiKey.tenantId, id);

    return {
      data: {
        booking_id: booking.id,
        status: booking.status,
        start_time: booking.startTime.toISOString(),
        end_time: booking.endTime.toISOString(),
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
