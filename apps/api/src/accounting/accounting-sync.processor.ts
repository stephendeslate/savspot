import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from './accounting.service';

interface AccountingSyncJobData {
  connectionId: string;
  tenantId: string;
  fullSync?: boolean;
}

@Injectable()
export class AccountingSyncInvoicesHandler {
  private readonly logger = new Logger(AccountingSyncInvoicesHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  async handle(job: Job<AccountingSyncJobData>): Promise<void> {
    const { connectionId, tenantId } = job.data;
    this.logger.log(`Starting invoice sync for connection ${connectionId} (tenant: ${tenantId})`);

    try {
      const connection = await this.prisma.accountingConnection.findFirst({
        where: { id: connectionId, tenantId, status: 'ACTIVE' },
      });

      if (!connection) {
        this.logger.warn(`Connection ${connectionId} not found or inactive, skipping`);
        return;
      }

      let tokens = this.accountingService.getTokensFromConnection(connection);
      const provider = this.accountingService.getProvider(connection.provider);

      if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
        this.logger.log(`Refreshing expired token for connection ${connectionId}`);
        tokens = await provider.refreshToken(tokens.refreshToken);

        await this.prisma.accountingConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
          },
        });
      }

      const invoices = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        return tx.invoice.findMany({
          where: { tenantId },
          include: {
            lineItems: { orderBy: { sortOrder: 'asc' } },
            booking: {
              select: {
                client: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      });

      let syncedCount = 0;
      for (const invoice of invoices) {
        const result = await provider.syncInvoice(tokens, {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.booking?.client?.name ?? 'Unknown',
          clientEmail: invoice.booking?.client?.email ?? '',
          lineItems: invoice.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice.toNumber(),
            total: li.total.toNumber(),
          })),
          subtotal: invoice.subtotal.toNumber(),
          taxAmount: invoice.taxAmount.toNumber(),
          total: invoice.total.toNumber(),
          currency: invoice.currency,
          dueDate: invoice.dueDate ?? new Date(),
        });

        if (result.success) {
          syncedCount++;
        } else {
          this.logger.warn(`Failed to sync invoice ${invoice.invoiceNumber}: ${result.error}`);
        }
      }

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { lastSyncedAt: new Date() },
      });

      this.logger.log(
        `Invoice sync complete for connection ${connectionId}: ${syncedCount}/${invoices.length} synced`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Invoice sync failed for connection ${connectionId}: ${message}`);

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { status: 'ERROR', errorMessage: message },
      }).catch(() => { /* best effort */ });

      throw err;
    }
  }
}

@Injectable()
export class AccountingSyncPaymentsHandler {
  private readonly logger = new Logger(AccountingSyncPaymentsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  async handle(job: Job<AccountingSyncJobData>): Promise<void> {
    const { connectionId, tenantId } = job.data;
    this.logger.log(`Starting payment sync for connection ${connectionId} (tenant: ${tenantId})`);

    try {
      const connection = await this.prisma.accountingConnection.findFirst({
        where: { id: connectionId, tenantId, status: 'ACTIVE' },
      });

      if (!connection) {
        this.logger.warn(`Connection ${connectionId} not found or inactive, skipping`);
        return;
      }

      let tokens = this.accountingService.getTokensFromConnection(connection);
      const provider = this.accountingService.getProvider(connection.provider);

      if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
        tokens = await provider.refreshToken(tokens.refreshToken);

        await this.prisma.accountingConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
          },
        });
      }

      const payments = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        return tx.payment.findMany({
          where: { tenantId, status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      });

      let syncedCount = 0;
      for (const payment of payments) {
        const result = await provider.syncPayment(tokens, {
          id: payment.id,
          amount: payment.amount.toNumber(),
          currency: payment.currency,
          paymentDate: payment.createdAt,
          method: payment.type ?? 'card',
        });

        if (result.success) {
          syncedCount++;
        } else {
          this.logger.warn(`Failed to sync payment ${payment.id}: ${result.error}`);
        }
      }

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { lastSyncedAt: new Date() },
      });

      this.logger.log(
        `Payment sync complete for connection ${connectionId}: ${syncedCount}/${payments.length} synced`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Payment sync failed for connection ${connectionId}: ${message}`);

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { status: 'ERROR', errorMessage: message },
      }).catch(() => { /* best effort */ });

      throw err;
    }
  }
}

interface AccountingSyncSingleInvoiceJobData {
  connectionId: string;
  tenantId: string;
  invoiceId: string;
}

@Injectable()
export class AccountingSyncSingleInvoiceHandler {
  private readonly logger = new Logger(AccountingSyncSingleInvoiceHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  async handle(job: Job<AccountingSyncSingleInvoiceJobData>): Promise<void> {
    const { connectionId, tenantId, invoiceId } = job.data;
    this.logger.log(`Starting single invoice sync for invoice ${invoiceId} (connection: ${connectionId}, tenant: ${tenantId})`);

    try {
      const connection = await this.prisma.accountingConnection.findFirst({
        where: { id: connectionId, tenantId, status: 'ACTIVE' },
      });

      if (!connection) {
        this.logger.warn(`Connection ${connectionId} not found or inactive, skipping`);
        return;
      }

      let tokens = this.accountingService.getTokensFromConnection(connection);
      const provider = this.accountingService.getProvider(connection.provider);

      if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
        this.logger.log(`Refreshing expired token for connection ${connectionId}`);
        tokens = await provider.refreshToken(tokens.refreshToken);

        await this.prisma.accountingConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
          },
        });
      }

      const invoice = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        return tx.invoice.findFirst({
          where: { id: invoiceId, tenantId },
          include: {
            lineItems: { orderBy: { sortOrder: 'asc' } },
            booking: {
              select: {
                client: { select: { name: true, email: true } },
              },
            },
          },
        });
      });

      if (!invoice) {
        this.logger.warn(`Invoice ${invoiceId} not found for tenant ${tenantId}, skipping`);
        return;
      }

      const result = await provider.syncInvoice(tokens, {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.booking?.client?.name ?? 'Unknown',
        clientEmail: invoice.booking?.client?.email ?? '',
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice.toNumber(),
          total: li.total.toNumber(),
        })),
        subtotal: invoice.subtotal.toNumber(),
        taxAmount: invoice.taxAmount.toNumber(),
        total: invoice.total.toNumber(),
        currency: invoice.currency,
        dueDate: invoice.dueDate ?? new Date(),
      });

      if (result.success) {
        this.logger.log(`Single invoice sync complete for invoice ${invoiceId}`);
      } else {
        this.logger.warn(`Failed to sync invoice ${invoice.invoiceNumber}: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Single invoice sync failed for invoice ${invoiceId}: ${message}`);

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { status: 'ERROR', errorMessage: message },
      }).catch(() => { /* best effort */ });

      throw err;
    }
  }
}

@Injectable()
export class AccountingSyncClientsHandler {
  private readonly logger = new Logger(AccountingSyncClientsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  async handle(job: Job<AccountingSyncJobData>): Promise<void> {
    const { connectionId, tenantId } = job.data;
    this.logger.log(`Starting client sync for connection ${connectionId} (tenant: ${tenantId})`);

    try {
      const connection = await this.prisma.accountingConnection.findFirst({
        where: { id: connectionId, tenantId, status: 'ACTIVE' },
      });

      if (!connection) {
        this.logger.warn(`Connection ${connectionId} not found or inactive, skipping`);
        return;
      }

      let tokens = this.accountingService.getTokensFromConnection(connection);
      const provider = this.accountingService.getProvider(connection.provider);

      if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
        tokens = await provider.refreshToken(tokens.refreshToken);

        await this.prisma.accountingConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
          },
        });
      }

      const bookings = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        return tx.booking.findMany({
          where: { tenantId },
          select: {
            client: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
          distinct: ['clientId'],
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
      });

      const uniqueClients = bookings.map((b) => b.client);

      let syncedCount = 0;
      for (const client of uniqueClients) {
        const result = await provider.syncClient(tokens, {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone ?? undefined,
        });

        if (result.success) {
          syncedCount++;
        } else {
          this.logger.warn(`Failed to sync client ${client.name}: ${result.error}`);
        }
      }

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { lastSyncedAt: new Date() },
      });

      this.logger.log(
        `Client sync complete for connection ${connectionId}: ${syncedCount}/${uniqueClients.length} synced`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Client sync failed for connection ${connectionId}: ${message}`);

      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { status: 'ERROR', errorMessage: message },
      }).catch(() => { /* best effort */ });

      throw err;
    }
  }
}
