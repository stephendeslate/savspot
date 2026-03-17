import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { SubscriptionTierGuard, RequireTier } from './guards/subscription-tier.guard';
import { AnalyticsQueryService } from './services/analytics-query.service';
import { ExportService } from './services/export.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { ExportDto } from './dto/export.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard, SubscriptionTierGuard)
@TenantRoles('OWNER', 'ADMIN')
@Controller('tenants/:tenantId/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsQueryService: AnalyticsQueryService,
    private readonly exportService: ExportService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics overview KPIs' })
  @ApiResponse({ status: 200, description: 'Overview KPIs' })
  async getOverview(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getOverview(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('revenue')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get revenue trends' })
  @ApiResponse({ status: 200, description: 'Revenue trend data' })
  async getRevenue(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getRevenueTrends(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('bookings')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get booking volume trends' })
  @ApiResponse({ status: 200, description: 'Booking trend data' })
  async getBookings(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getBookingTrends(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('no-shows')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get no-show rate trends' })
  @ApiResponse({ status: 200, description: 'No-show trend data' })
  async getNoShows(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getNoShowTrends(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('clients')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get client metrics (new vs returning, LTV)' })
  @ApiResponse({ status: 200, description: 'Client metrics' })
  async getClients(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getClientMetrics(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('funnel')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get booking flow funnel metrics' })
  @ApiResponse({ status: 200, description: 'Funnel data' })
  async getFunnel(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getFunnelData(
      tenantId,
      this.buildDateRange(query),
    );
  }

  @Get('utilization')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get slot utilization heatmap data' })
  @ApiResponse({ status: 200, description: 'Utilization heatmap data' })
  async getUtilization(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getUtilizationHeatmap(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('staff-performance')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get per-staff performance metrics' })
  @ApiResponse({ status: 200, description: 'Staff performance data' })
  async getStaffPerformance(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getStaffPerformance(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Get('benchmarks')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get benchmarks vs category average' })
  @ApiResponse({ status: 200, description: 'Benchmark data' })
  async getBenchmarks(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.analyticsQueryService.getBenchmarks(tenantId);
  }

  @Get('benchmarks/trends')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Get benchmark trends over time' })
  @ApiResponse({ status: 200, description: 'Benchmark trend data' })
  async getBenchmarkTrends(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsQueryService.getBenchmarkTrends(
      tenantId,
      this.buildDateRange(query),
      this.buildFilters(query),
    );
  }

  @Post('export')
  @RequireTier('TEAM')
  @ApiOperation({ summary: 'Export analytics data as CSV or JSON' })
  @ApiResponse({ status: 200, description: 'Exported file' })
  async exportData(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: AnalyticsQueryDto,
    @Body() dto: ExportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dateRange = this.buildDateRange(query);
    const filters = this.buildFilters(query);

    const result =
      dto.format === 'csv'
        ? await this.exportService.exportCsv(
            tenantId,
            dto.metrics,
            dateRange,
            filters,
          )
        : await this.exportService.exportJson(
            tenantId,
            dto.metrics,
            dateRange,
            filters,
          );

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });

    return new StreamableFile(result.data);
  }

  private buildDateRange(query: AnalyticsQueryDto) {
    return {
      from: new Date(query.from),
      to: new Date(query.to),
    };
  }

  private buildFilters(query: AnalyticsQueryDto) {
    return {
      serviceId: query.serviceId,
      staffId: query.staffId,
      source: query.source,
      groupBy: query.groupBy,
    };
  }
}
