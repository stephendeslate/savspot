import {
  Injectable,
  NotFoundException,
  BadRequestException,
  NotImplementedException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QuickBooksProvider } from './providers/quickbooks.provider';
import { XeroProvider } from './providers/xero.provider';
import { AccountingProviderInterface, AccountingTokens } from './interfaces/accounting-provider.interface';
import { SyncOptionsDto } from './dto/sync-options.dto';
import {
  QUEUE_ACCOUNTING,
  JOB_ACCOUNTING_SYNC_INVOICES,
  JOB_ACCOUNTING_SYNC_PAYMENTS,
  JOB_ACCOUNTING_SYNC_CLIENTS,
  JOB_ACCOUNTING_SYNC_SINGLE_INVOICE,
} from '../bullmq/queue.constants';
import { UpdateMappingsDto } from './dto/update-mappings.dto';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  private readonly providers: Record<string, AccountingProviderInterface>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly quickBooksProvider: QuickBooksProvider,
    private readonly xeroProvider: XeroProvider,
    @InjectQueue(QUEUE_ACCOUNTING) private readonly accountingQueue: Queue,
  ) {
    this.providers = {
      QUICKBOOKS: this.quickBooksProvider,
      XERO: this.xeroProvider,
    };
  }

  async getConnections(tenantId: string) {
    return this.prisma.accountingConnection.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        companyId: true,
        status: true,
        lastSyncedAt: true,
        errorMessage: true,
      },
    });
  }

  async initiateOAuth(tenantId: string, provider: string) {
    const providerImpl = this.getProvider(provider);
    const redirectUri = this.getCallbackUrl(provider);
    const authUrl = await providerImpl.getAuthUrl(tenantId, redirectUri);

    return { authUrl };
  }

  async handleCallback(provider: string, code: string, state: string) {
    const providerImpl = this.getProvider(provider);
    const redirectUri = this.getCallbackUrl(provider);

    let stateData: { tenantId: string; provider: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
        tenantId: string;
        provider: string;
      };
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    if (stateData.provider !== provider.toUpperCase()) {
      throw new BadRequestException('Provider mismatch in state parameter');
    }

    const tokens = await providerImpl.exchangeCode(code, redirectUri);

    const existingConnection = await this.prisma.accountingConnection.findFirst({
      where: {
        tenantId: stateData.tenantId,
        provider: provider.toUpperCase() as 'QUICKBOOKS' | 'XERO',
      },
    });

    if (existingConnection) {
      await this.prisma.accountingConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          companyId: tokens.realmId ?? tokens.tenantId ?? existingConnection.companyId,
          status: 'ACTIVE',
          errorMessage: null,
        },
      });

      this.logger.log(
        `Reconnected ${provider} accounting for tenant ${stateData.tenantId}`,
      );
      return { tenantId: stateData.tenantId, connectionId: existingConnection.id };
    }

    const connection = await this.prisma.accountingConnection.create({
      data: {
        tenantId: stateData.tenantId,
        provider: provider.toUpperCase() as 'QUICKBOOKS' | 'XERO',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        companyId: tokens.realmId ?? tokens.tenantId,
        status: 'ACTIVE',
      },
    });

    this.logger.log(
      `Connected ${provider} accounting for tenant ${stateData.tenantId} (connection: ${connection.id})`,
    );

    return { tenantId: stateData.tenantId, connectionId: connection.id };
  }

  async disconnect(tenantId: string, connectionId: string) {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { id: connectionId, tenantId },
    });

    if (!connection) {
      throw new NotFoundException('Accounting connection not found');
    }

    await this.prisma.accountingConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        accessToken: '',
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });

    this.logger.log(
      `Disconnected ${connection.provider} accounting connection ${connectionId}`,
    );

    return { success: true };
  }

  async triggerSync(tenantId: string, connectionId: string, options?: SyncOptionsDto) {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { id: connectionId, tenantId, status: 'ACTIVE' },
    });

    if (!connection) {
      throw new NotFoundException('Active accounting connection not found');
    }

    const jobData = {
      connectionId,
      tenantId,
      fullSync: options?.fullSync ?? false,
    };

    const jobOpts = {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    };

    if (!options?.syncType || options.syncType === 'invoices') {
      await this.accountingQueue.add(JOB_ACCOUNTING_SYNC_INVOICES, jobData, jobOpts);
    }
    if (!options?.syncType || options.syncType === 'payments') {
      await this.accountingQueue.add(JOB_ACCOUNTING_SYNC_PAYMENTS, jobData, jobOpts);
    }
    if (!options?.syncType || options.syncType === 'clients') {
      await this.accountingQueue.add(JOB_ACCOUNTING_SYNC_CLIENTS, jobData, jobOpts);
    }

    this.logger.log(
      `Queued accounting sync for connection ${connectionId} (type: ${options?.syncType ?? 'all'})`,
    );

    return { success: true, message: 'Sync jobs enqueued' };
  }

  async getSyncLogs(tenantId: string) {
    return this.prisma.accountingSyncLog.findMany({
      where: { tenantId },
      select: {
        id: true,
        connectionId: true,
        entityType: true,
        entityId: true,
        direction: true,
        status: true,
        externalId: true,
        errorMessage: true,
        retryCount: true,
        syncedAt: true,
        createdAt: true,
        connection: {
          select: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateMappings(
    tenantId: string,
    connectionId: string,
    dto: UpdateMappingsDto,
  ) {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { id: connectionId, tenantId },
    });

    if (!connection) {
      throw new NotFoundException('Accounting connection not found');
    }

    const categoryMappings: Record<string, string> = {};
    for (const mapping of dto.mappings) {
      categoryMappings[mapping.localCategory] = mapping.externalAccountId;
    }

    await this.prisma.accountingConnection.update({
      where: { id: connectionId },
      data: { categoryMappings },
    });

    this.logger.log(
      `Updated ${dto.mappings.length} account mappings for connection ${connectionId}`,
    );

    return { success: true, mappingCount: dto.mappings.length };
  }

  async refreshAccounts(tenantId: string, connectionId: string) {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { id: connectionId, tenantId },
    });

    if (!connection) {
      throw new NotFoundException('Accounting connection not found');
    }

    throw new NotImplementedException(
      'Account refresh requires provider integration. Connect to QuickBooks or Xero to sync accounts.',
    );
  }

  async getConnectionStatus(tenantId: string, connectionId: string) {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { id: connectionId, tenantId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncedAt: true,
        errorMessage: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Accounting connection not found');
    }

    const pendingSyncCount = await this.prisma.accountingSyncLog.count({
      where: {
        connectionId,
        tenantId,
        status: 'PENDING',
      },
    });

    return {
      ...connection,
      pendingSyncCount,
    };
  }

  async syncSingleInvoice(
    tenantId: string,
    connectionId: string,
    invoiceId: string,
  ) {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { id: connectionId, tenantId, status: 'ACTIVE' },
    });

    if (!connection) {
      throw new NotFoundException('Active accounting connection not found');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const jobData = {
      connectionId,
      tenantId,
      invoiceId,
    };

    await this.accountingQueue.add(
      JOB_ACCOUNTING_SYNC_SINGLE_INVOICE,
      jobData,
      {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    );

    this.logger.log(
      `Queued single invoice sync for invoice ${invoiceId} on connection ${connectionId}`,
    );

    return { success: true, message: 'Invoice sync job enqueued', invoiceId };
  }

  getTokensFromConnection(connection: {
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    companyId: string | null;
    provider: string;
  }): AccountingTokens {
    return {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken ?? '',
      expiresAt: connection.tokenExpiresAt ?? new Date(0),
      realmId: connection.provider === 'QUICKBOOKS' ? (connection.companyId ?? undefined) : undefined,
      tenantId: connection.provider === 'XERO' ? (connection.companyId ?? undefined) : undefined,
    };
  }

  getProvider(provider: string): AccountingProviderInterface {
    const impl = this.providers[provider.toUpperCase()];
    if (!impl) {
      throw new BadRequestException(`Unsupported accounting provider: ${provider}`);
    }
    return impl;
  }

  private getCallbackUrl(provider: string): string {
    const apiUrl = this.configService.get<string>('app.apiUrl', 'http://localhost:3001');
    return `${apiUrl}/api/accounting/callback/${provider.toLowerCase()}`;
  }
}
