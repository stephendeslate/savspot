import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { MultiLocationService } from './multi-location.service';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Multi-Location')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MultiLocationController {
  constructor(private readonly multiLocationService: MultiLocationService) {}

  @Get('venues/:venueId/staff')
  @ApiOperation({ summary: 'List staff assigned to a venue' })
  @ApiResponse({ status: 200, description: 'List of venue staff' })
  async getVenueStaff(
    @Param('venueId', UuidValidationPipe) venueId: string,
  ) {
    return this.multiLocationService.getVenueStaff(venueId);
  }

  @Post('venues/:venueId/staff')
  @ApiOperation({ summary: 'Assign staff to a venue' })
  @ApiResponse({ status: 201, description: 'Staff assigned to venue' })
  async assignStaff(
    @Param('venueId', UuidValidationPipe) venueId: string,
    @Body() dto: AssignStaffDto,
  ) {
    return this.multiLocationService.assignStaff(
      venueId,
      dto.userId,
      dto.isPrimary ?? false,
    );
  }

  @Delete('venues/:venueId/staff/:userId')
  @ApiOperation({ summary: 'Remove staff from a venue' })
  @ApiResponse({ status: 200, description: 'Staff removed from venue' })
  async removeStaff(
    @Param('venueId', UuidValidationPipe) venueId: string,
    @Param('userId', UuidValidationPipe) userId: string,
  ) {
    return this.multiLocationService.removeStaff(venueId, userId);
  }

  @Get('venues/:venueId/analytics')
  @ApiOperation({ summary: 'Get per-venue analytics (bookings, revenue, utilization)' })
  @ApiResponse({ status: 200, description: 'Venue analytics' })
  async getVenueAnalytics(
    @Param('venueId', UuidValidationPipe) venueId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = query.to ? new Date(query.to) : now;
    return this.multiLocationService.getVenueAnalytics(venueId, from, to);
  }

  @Get('tenants/:tenantId/analytics/cross-location')
  @ApiOperation({ summary: 'Cross-location comparison analytics' })
  @ApiResponse({ status: 200, description: 'Cross-location analytics' })
  async getCrossLocationAnalytics(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = query.to ? new Date(query.to) : now;
    return this.multiLocationService.getCrossLocationAnalytics(tenantId, from, to);
  }
}
