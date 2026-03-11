import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { IcalFeedService } from './ical-feed.service';

@ApiTags('Calendar')
@Controller('ical')
export class IcalFeedController {
  constructor(private readonly icalFeedService: IcalFeedService) {}

  @Get(':tenantSlug/:providerSlug.ics')
  @Public()
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @ApiOperation({ summary: 'Public iCal feed for provider bookings' })
  @ApiResponse({ status: 200, description: 'iCal feed content' })
  @ApiResponse({ status: 401, description: 'Invalid or missing feed token' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getFeed(
    @Param('tenantSlug') tenantSlug: string,
    @Param('providerSlug') _providerSlug: string,
    @Query('ical_feed_token') token: string,
    @Res() res: Response,
  ) {
    const ical = await this.icalFeedService.generateFeed(tenantSlug, token);
    res.set('Content-Disposition', 'inline; filename="calendar.ics"');
    res.send(ical);
  }
}
