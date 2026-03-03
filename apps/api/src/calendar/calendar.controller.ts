import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { GoogleCalendarService } from './calendar.service';
import { ConnectCalendarDto } from './dto/connect-calendar.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller()
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    private readonly calendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // OAuth Flow
  // ---------------------------------------------------------------------------

  /**
   * Initiate Google Calendar OAuth connection for the tenant.
   * Returns the authorization URL for the frontend to redirect to.
   */
  @Post('tenants/:tenantId/calendar/connect')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Initiate Google Calendar connection' })
  @ApiResponse({ status: 201, description: 'Authorization URL returned' })
  async connect(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() _: ConnectCalendarDto, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    const authUrl = this.calendarService.getAuthUrl(tenantId, userId);
    return { authUrl };
  }

  /**
   * Google OAuth2 callback handler.
   * Public endpoint — no JWT required (Google redirects here).
   * Redirects to the frontend calendar settings page.
   */
  @Get('auth/google-calendar/callback')
  @Public()
  @ApiOperation({ summary: 'Google Calendar OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend settings' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const webUrl = this.configService.get<string>(
      'app.webUrl',
      'http://localhost:3000',
    );

    if (error) {
      this.logger.warn(`Google Calendar OAuth error: ${error}`);
      res.redirect(
        `${webUrl}/settings/calendar?error=${encodeURIComponent(error)}`,
      );
      return;
    }

    if (!code || !state) {
      res.redirect(
        `${webUrl}/settings/calendar?error=${encodeURIComponent('Missing code or state parameter')}`,
      );
      return;
    }

    try {
      const { tenantId } = await this.calendarService.handleCallback(
        code,
        state,
      );
      res.redirect(
        `${webUrl}/settings/calendar?success=true&tenantId=${tenantId}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connection failed';
      this.logger.error(`Calendar OAuth callback failed: ${message}`);
      res.redirect(
        `${webUrl}/settings/calendar?error=${encodeURIComponent(message)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * List all calendar connections for the tenant.
   */
  @Get('tenants/:tenantId/calendar/connections')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List calendar connections' })
  @ApiResponse({ status: 200, description: 'List of calendar connections' })
  async getConnections(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.calendarService.getConnections(tenantId);
  }

  /**
   * Fetch available Google Calendars for a specific connection.
   */
  @Get('tenants/:tenantId/calendar/connections/:id/calendars')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get available calendars for a connection' })
  @ApiResponse({ status: 200, description: 'Available calendars list' })
  async getAvailableCalendars(
    @Param('tenantId', UuidValidationPipe) _tenantId: string,
    @Param('id', UuidValidationPipe) connectionId: string,
  ) {
    return this.calendarService.getAvailableCalendars(connectionId);
  }

  /**
   * Update sync settings for a calendar connection.
   */
  @Patch('tenants/:tenantId/calendar/connections/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Update calendar connection settings' })
  @ApiResponse({ status: 200, description: 'Connection updated' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async updateConnection(
    @Param('tenantId', UuidValidationPipe) _tenantId: string,
    @Param('id', UuidValidationPipe) connectionId: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.calendarService.updateConnection(connectionId, dto);
  }

  /**
   * Disconnect and delete a calendar connection.
   */
  @Delete('tenants/:tenantId/calendar/connections/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Disconnect calendar' })
  @ApiResponse({ status: 200, description: 'Calendar disconnected' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async disconnect(
    @Param('tenantId', UuidValidationPipe) _tenantId: string,
    @Param('id', UuidValidationPipe) connectionId: string,
  ) {
    await this.calendarService.disconnect(connectionId);
    return { success: true };
  }

  /**
   * Trigger a manual calendar sync (rate-limited: 4/hr).
   */
  @Post('tenants/:tenantId/calendar/connections/:id/sync')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Trigger manual calendar sync' })
  @ApiResponse({ status: 200, description: 'Sync job enqueued' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async manualSync(
    @Param('tenantId', UuidValidationPipe) _tenantId: string,
    @Param('id', UuidValidationPipe) connectionId: string,
  ) {
    await this.calendarService.manualSync(connectionId);
    return { success: true, message: 'Sync job enqueued' };
  }
}
