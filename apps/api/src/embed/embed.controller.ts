import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { EmbedService } from './embed.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateEmbedSessionDto } from './dto/create-embed-session.dto';

@ApiTags('Embed Widget')
@Throttle({ default: { limit: 100, ttl: 60_000 } })
@Controller('embed')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}

  @Get(':slug/config')
  @Public()
  @ApiOperation({ summary: 'Get widget configuration and branding for a tenant' })
  @ApiResponse({ status: 200, description: 'Widget config with branding' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getWidgetConfig(@Param('slug') slug: string) {
    return this.embedService.getWidgetConfig(slug);
  }

  @Get(':slug/services')
  @Public()
  @ApiOperation({ summary: 'List active services for widget' })
  @ApiResponse({ status: 200, description: 'Array of active services' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getAvailableServices(@Param('slug') slug: string) {
    return this.embedService.getAvailableServices(slug);
  }

  @Get(':slug/availability')
  @Public()
  @ApiOperation({ summary: 'Get available time slots for a service on a date' })
  @ApiResponse({ status: 200, description: 'Array of available time slots' })
  @ApiResponse({ status: 404, description: 'Business or service not found' })
  async getAvailability(
    @Param('slug') slug: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.embedService.getAvailability(slug, query.serviceId, query.date);
  }

  @Post(':slug/session')
  @Public()
  @ApiOperation({ summary: 'Create a booking session from the widget' })
  @ApiResponse({ status: 201, description: 'Booking session created' })
  @ApiResponse({ status: 404, description: 'Business or service not found' })
  async createBookingSession(
    @Param('slug') slug: string,
    @Body() dto: CreateEmbedSessionDto,
  ) {
    return this.embedService.createBookingSession(slug, dto);
  }
}
