import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateDigestDto } from './dto/update-digest.dto';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.preferencesService.getPreferences(userId, tenantId);
  }

  @Put()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(userId, tenantId, dto.preferences);
  }

  @Get('digest')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get digest frequency setting' })
  @ApiResponse({ status: 200, description: 'Digest frequency' })
  async getDigestFrequency(
    @Param('tenantId', UuidValidationPipe) _tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.preferencesService.getDigestFrequency(userId);
  }

  @Put('digest')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Update digest frequency' })
  @ApiResponse({ status: 200, description: 'Digest frequency updated' })
  async updateDigestFrequency(
    @Param('tenantId', UuidValidationPipe) _tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateDigestDto,
  ) {
    return this.preferencesService.updateDigestFrequency(userId, dto.frequency);
  }
}
