import {
  Controller,
  Get,
  Post,
  Param,
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
import { OutlookCalendarService } from './outlook-calendar.service';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller()
export class OutlookCalendarController {
  private readonly logger = new Logger(OutlookCalendarController.name);

  constructor(
    private readonly outlookCalendarService: OutlookCalendarService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // OAuth Flow
  // ---------------------------------------------------------------------------

  /**
   * Initiate Outlook/Microsoft 365 Calendar OAuth connection for the tenant.
   * Returns the authorization URL for the frontend to redirect to.
   */
  @Post('tenants/:tenantId/calendar/outlook/connect')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Initiate Outlook Calendar connection' })
  @ApiResponse({ status: 201, description: 'Authorization URL returned' })
  async connect(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const authUrl = this.outlookCalendarService.getAuthUrl(tenantId, userId);
    return { authUrl };
  }

  /**
   * Microsoft OAuth2 callback handler.
   * Public endpoint — no JWT required (Microsoft redirects here).
   * Redirects to the frontend calendar settings page.
   */
  @Get('auth/outlook-calendar/callback')
  @Public()
  @ApiOperation({ summary: 'Outlook Calendar OAuth callback' })
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
      this.logger.warn(`Outlook Calendar OAuth error: ${error}`);
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
      const { tenantId } = await this.outlookCalendarService.handleCallback(
        code,
        state,
      );
      res.redirect(
        `${webUrl}/settings/calendar?success=true&tenantId=${tenantId}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connection failed';
      this.logger.error(`Outlook Calendar OAuth callback failed: ${message}`);
      res.redirect(
        `${webUrl}/settings/calendar?error=${encodeURIComponent(message)}`,
      );
    }
  }
}
