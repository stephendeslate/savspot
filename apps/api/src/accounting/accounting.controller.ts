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
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { AccountingService } from './accounting.service';
import { SyncOptionsDto } from './dto/sync-options.dto';
import { UpdateMappingsDto } from './dto/update-mappings.dto';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Accounting')
@ApiBearerAuth()

@RequiresLicense()
@Controller()
export class AccountingController {
  private readonly logger = new Logger(AccountingController.name);

  constructor(
    private readonly accountingService: AccountingService,
    private readonly configService: ConfigService,
  ) {}

  @Get('tenants/:tenantId/accounting/connections')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List accounting connections' })
  @ApiResponse({ status: 200, description: 'List of accounting connections' })
  async getConnections(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.accountingService.getConnections(tenantId);
  }

  @Post('tenants/:tenantId/accounting/connect/:provider')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Initiate accounting OAuth connection' })
  @ApiResponse({ status: 201, description: 'Authorization URL returned' })
  async connect(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('provider') provider: string,
  ) {
    return this.accountingService.initiateOAuth(tenantId, provider);
  }

  @Get('api/accounting/callback/:provider')
  @Public()
  @ApiOperation({ summary: 'Accounting OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend settings' })
  async handleCallback(
    @Param('provider') provider: string,
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
      this.logger.warn(`Accounting OAuth error (${provider}): ${error}`);
      res.redirect(
        `${webUrl}/settings/accounting?error=${encodeURIComponent(error)}`,
      );
      return;
    }

    if (!code || !state) {
      res.redirect(
        `${webUrl}/settings/accounting?error=${encodeURIComponent('Missing code or state parameter')}`,
      );
      return;
    }

    try {
      const { tenantId } = await this.accountingService.handleCallback(
        provider,
        code,
        state,
      );
      res.redirect(
        `${webUrl}/settings/accounting?success=true&tenantId=${tenantId}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connection failed';
      this.logger.error(`Accounting OAuth callback failed (${provider}): ${message}`);
      res.redirect(
        `${webUrl}/settings/accounting?error=${encodeURIComponent(message)}`,
      );
    }
  }

  @Delete('tenants/:tenantId/accounting/connections/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Disconnect accounting provider' })
  @ApiResponse({ status: 200, description: 'Accounting provider disconnected' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async disconnect(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.accountingService.disconnect(tenantId, id);
  }

  @Post('tenants/:tenantId/accounting/connections/:id/sync')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Trigger manual accounting sync' })
  @ApiResponse({ status: 200, description: 'Sync jobs enqueued' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async triggerSync(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() options: SyncOptionsDto,
  ) {
    return this.accountingService.triggerSync(tenantId, id, options);
  }

  @Get('tenants/:tenantId/accounting/sync-logs')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List accounting sync history' })
  @ApiResponse({ status: 200, description: 'Sync history logs' })
  async getSyncLogs(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.accountingService.getSyncLogs(tenantId);
  }

  @Patch('tenants/:tenantId/accounting/connections/:id/mappings')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update account mappings for a connection' })
  @ApiResponse({ status: 200, description: 'Mappings updated' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async updateMappings(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateMappingsDto,
  ) {
    return this.accountingService.updateMappings(tenantId, id, dto);
  }

  @Post('tenants/:tenantId/accounting/connections/:id/refresh-accounts')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Fetch accounts from accounting provider' })
  @ApiResponse({ status: 201, description: 'List of external accounts' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async refreshAccounts(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.accountingService.refreshAccounts(tenantId, id);
  }

  @Get('tenants/:tenantId/accounting/connections/:id/status')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get sync status for a connection' })
  @ApiResponse({ status: 200, description: 'Connection sync status' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async getConnectionStatus(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.accountingService.getConnectionStatus(tenantId, id);
  }

  @Post('tenants/:tenantId/accounting/connections/:id/sync/:invoiceId')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Sync a single invoice to accounting provider' })
  @ApiResponse({ status: 201, description: 'Invoice sync job enqueued' })
  @ApiResponse({ status: 404, description: 'Connection or invoice not found' })
  async syncSingleInvoice(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Param('invoiceId', UuidValidationPipe) invoiceId: string,
  ) {
    return this.accountingService.syncSingleInvoice(tenantId, id, invoiceId);
  }
}
