import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { PlatformMetricsService } from './platform-metrics.service';

@ApiTags('Platform Metrics')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('PLATFORM_ADMIN')
@Controller('admin/platform-metrics')
export class PlatformMetricsController {
  constructor(private readonly metricsService: PlatformMetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get latest value for all platform metrics' })
  @ApiResponse({ status: 200, description: 'Latest platform metrics' })
  async getAllMetrics() {
    return this.metricsService.getAllMetrics();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get unacknowledged platform alerts' })
  @ApiResponse({ status: 200, description: 'Unacknowledged alerts' })
  async getAlerts() {
    return this.metricsService.getUnacknowledgedAlerts();
  }

  @Get(':key/history')
  @ApiOperation({ summary: 'Get historical values for a metric' })
  @ApiResponse({ status: 200, description: 'Metric history' })
  async getMetricHistory(@Param('key') key: string) {
    return this.metricsService.getMetricHistory(key);
  }

  @Patch('alerts/:id')
  @ApiOperation({ summary: 'Acknowledge a platform alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async acknowledgeAlert(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.metricsService.acknowledgeAlert(id);
  }
}
