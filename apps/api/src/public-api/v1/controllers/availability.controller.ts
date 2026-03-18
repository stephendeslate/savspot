import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { PublicApiKeyGuard } from '../guards/api-key.guard';
import { ApiVersionInterceptor } from '../interceptors/api-version.interceptor';
import { ApiKeyScopes } from '../../decorators/api-key-scopes.decorator';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { AvailabilityService } from '../../../availability/availability.service';
import { ValidatedApiKey } from '../../services/api-key.service';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Public API - Availability')
@Public()
@UseGuards(PublicApiKeyGuard)
@UseInterceptors(ApiVersionInterceptor)

@RequiresLicense()
@Controller('api/v1/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiKeyScopes('availability:read')
  @ApiOperation({ summary: 'Query available time slots' })
  @ApiResponse({ status: 200, description: 'List of available time slots' })
  async getAvailability(
    @Query() query: AvailabilityQueryDto,
    @Req() req: Request,
  ) {
    const apiKey = (req as unknown as Record<string, unknown>)['apiKey'] as ValidatedApiKey | undefined;

    if (!apiKey) {
      throw new BadRequestException('API key context is required for availability queries');
    }

    const guestCount = query.guest_count ?? 1;
    const date = query.date;

    const slots = await this.availabilityService.getAvailableSlots({
      tenantId: apiKey.tenantId,
      serviceId: query.service_id,
      startDate: date,
      endDate: date,
    });

    return {
      data: {
        date,
        service_id: query.service_id,
        staff_id: query.staff_id ?? null,
        guest_count: guestCount,
        slots: slots.map((slot) => ({
          start_time: slot.startTime,
          end_time: slot.endTime,
        })),
      },
    };
  }
}
