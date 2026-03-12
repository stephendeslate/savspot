import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AccountingService } from '@/accounting/accounting.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CONNECTION_ID = 'conn-001';
const INVOICE_ID = 'inv-001';

function makePrisma() {
  return {
    accountingConnection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    accountingSyncLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
    },
  };
}

function makeConfigService() {
  return {
    get: vi.fn((_key: string, def: unknown) => def),
  };
}

function makeQuickBooksProvider() {
  return {
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
  };
}

function makeXeroProvider() {
  return {
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
  };
}

function makeQueue() {
  return {
    add: vi.fn(),
  };
}

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: CONNECTION_ID,
    tenantId: TENANT_ID,
    provider: 'QUICKBOOKS',
    companyId: 'company-1',
    status: 'ACTIVE',
    lastSyncedAt: null,
    errorMessage: null,
    accessToken: 'token-abc',
    refreshToken: 'refresh-abc',
    tokenExpiresAt: new Date('2026-06-01'),
    ...overrides,
  };
}

describe('AccountingService', () => {
  let service: AccountingService;
  let prisma: ReturnType<typeof makePrisma>;
  let configService: ReturnType<typeof makeConfigService>;
  let quickBooksProvider: ReturnType<typeof makeQuickBooksProvider>;
  let xeroProvider: ReturnType<typeof makeXeroProvider>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    configService = makeConfigService();
    quickBooksProvider = makeQuickBooksProvider();
    xeroProvider = makeXeroProvider();
    queue = makeQueue();
    service = new AccountingService(
      prisma as never,
      configService as never,
      quickBooksProvider as never,
      xeroProvider as never,
      queue as never,
    );
  });

  // ---------- getConnections ----------

  describe('getConnections', () => {
    it('returns connections for a tenant', async () => {
      const connections = [makeConnection()];
      prisma.accountingConnection.findMany.mockResolvedValue(connections);

      const result = await service.getConnections(TENANT_ID);

      expect(result).toEqual(connections);
      expect(prisma.accountingConnection.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        select: expect.objectContaining({ id: true, provider: true }),
      });
    });

    it('returns empty array when tenant has no connections', async () => {
      prisma.accountingConnection.findMany.mockResolvedValue([]);
      const result = await service.getConnections(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  // ---------- initiateOAuth ----------

  describe('initiateOAuth', () => {
    it('returns auth URL for QuickBooks provider', async () => {
      quickBooksProvider.getAuthUrl.mockResolvedValue('https://qb.example.com/auth');

      const result = await service.initiateOAuth(TENANT_ID, 'QUICKBOOKS');

      expect(result).toEqual({ authUrl: 'https://qb.example.com/auth' });
    });

    it('returns auth URL for Xero provider', async () => {
      xeroProvider.getAuthUrl.mockResolvedValue('https://xero.example.com/auth');

      const result = await service.initiateOAuth(TENANT_ID, 'XERO');

      expect(result).toEqual({ authUrl: 'https://xero.example.com/auth' });
    });

    it('throws BadRequestException for unsupported provider', async () => {
      await expect(
        service.initiateOAuth(TENANT_ID, 'SAGE'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------- handleCallback ----------

  describe('handleCallback', () => {
    const validState = Buffer.from(
      JSON.stringify({ tenantId: TENANT_ID, provider: 'QUICKBOOKS' }),
    ).toString('base64url');

    it('creates a new connection when none exists', async () => {
      quickBooksProvider.exchangeCode.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: new Date('2026-06-01'),
        realmId: 'realm-1',
      });
      prisma.accountingConnection.findFirst.mockResolvedValue(null);
      prisma.accountingConnection.create.mockResolvedValue({
        id: CONNECTION_ID,
      });

      const result = await service.handleCallback('QUICKBOOKS', 'auth-code', validState);

      expect(result.connectionId).toBe(CONNECTION_ID);
      expect(prisma.accountingConnection.create).toHaveBeenCalled();
    });

    it('updates existing connection on reconnect', async () => {
      quickBooksProvider.exchangeCode.mockResolvedValue({
        accessToken: 'at-new',
        refreshToken: 'rt-new',
        expiresAt: new Date('2026-07-01'),
        realmId: 'realm-1',
      });
      prisma.accountingConnection.findFirst.mockResolvedValue(
        makeConnection(),
      );
      prisma.accountingConnection.update.mockResolvedValue(makeConnection());

      const result = await service.handleCallback('QUICKBOOKS', 'auth-code', validState);

      expect(result.connectionId).toBe(CONNECTION_ID);
      expect(prisma.accountingConnection.update).toHaveBeenCalled();
    });

    it('throws BadRequestException for invalid state', async () => {
      await expect(
        service.handleCallback('QUICKBOOKS', 'code', 'not-valid-base64'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for provider mismatch in state', async () => {
      const mismatchState = Buffer.from(
        JSON.stringify({ tenantId: TENANT_ID, provider: 'XERO' }),
      ).toString('base64url');

      quickBooksProvider.exchangeCode.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: new Date(),
      });

      await expect(
        service.handleCallback('QUICKBOOKS', 'code', mismatchState),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------- disconnect ----------

  describe('disconnect', () => {
    it('disconnects an existing connection', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());
      prisma.accountingConnection.update.mockResolvedValue(makeConnection({ status: 'DISCONNECTED' }));

      const result = await service.disconnect(TENANT_ID, CONNECTION_ID);

      expect(result).toEqual({ success: true });
      expect(prisma.accountingConnection.update).toHaveBeenCalledWith({
        where: { id: CONNECTION_ID },
        data: expect.objectContaining({ status: 'DISCONNECTED' }),
      });
    });

    it('throws NotFoundException when connection does not exist', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.disconnect(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- triggerSync ----------

  describe('triggerSync', () => {
    it('enqueues all sync jobs when no syncType specified', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());

      const result = await service.triggerSync(TENANT_ID, CONNECTION_ID);

      expect(result).toEqual({ success: true, message: 'Sync jobs enqueued' });
      expect(queue.add).toHaveBeenCalledTimes(3);
    });

    it('enqueues only invoices sync when syncType is invoices', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());

      await service.triggerSync(TENANT_ID, CONNECTION_ID, { syncType: 'invoices' } as never);

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add.mock.calls[0]![0]).toBe('accountingSyncInvoices');
    });

    it('enqueues only payments sync when syncType is payments', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());

      await service.triggerSync(TENANT_ID, CONNECTION_ID, { syncType: 'payments' } as never);

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add.mock.calls[0]![0]).toBe('accountingSyncPayments');
    });

    it('enqueues only clients sync when syncType is clients', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());

      await service.triggerSync(TENANT_ID, CONNECTION_ID, { syncType: 'clients' } as never);

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add.mock.calls[0]![0]).toBe('accountingSyncClients');
    });

    it('throws NotFoundException when connection not found or inactive', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.triggerSync(TENANT_ID, CONNECTION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- getSyncLogs ----------

  describe('getSyncLogs', () => {
    it('returns sync logs for a tenant', async () => {
      const logs = [{ id: 'log-1', connectionId: CONNECTION_ID }];
      prisma.accountingSyncLog.findMany.mockResolvedValue(logs);

      const result = await service.getSyncLogs(TENANT_ID);

      expect(result).toEqual(logs);
    });
  });

  // ---------- updateMappings ----------

  describe('updateMappings', () => {
    it('updates category mappings on a connection', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());
      prisma.accountingConnection.update.mockResolvedValue(makeConnection());

      const dto = {
        mappings: [
          { localCategory: 'SERVICE', externalAccountId: '4000' },
          { localCategory: 'PRODUCT', externalAccountId: '4100' },
        ],
      };

      const result = await service.updateMappings(TENANT_ID, CONNECTION_ID, dto as never);

      expect(result).toEqual({ success: true, mappingCount: 2 });
    });

    it('throws NotFoundException when connection not found', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMappings(TENANT_ID, 'nope', { mappings: [] } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- refreshAccounts ----------

  describe('refreshAccounts', () => {
    it('returns stub accounts for a valid connection', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());

      const result = await service.refreshAccounts(TENANT_ID, CONNECTION_ID);

      expect(result.provider).toBe('QUICKBOOKS');
      expect(result.accounts).toHaveLength(5);
    });

    it('throws NotFoundException when connection not found', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshAccounts(TENANT_ID, 'nope'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- getConnectionStatus ----------

  describe('getConnectionStatus', () => {
    it('returns connection status with pending sync count', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue({
        id: CONNECTION_ID,
        provider: 'QUICKBOOKS',
        status: 'ACTIVE',
        lastSyncedAt: null,
        errorMessage: null,
      });
      prisma.accountingSyncLog.count.mockResolvedValue(3);

      const result = await service.getConnectionStatus(TENANT_ID, CONNECTION_ID);

      expect(result.pendingSyncCount).toBe(3);
      expect(result.id).toBe(CONNECTION_ID);
    });

    it('throws NotFoundException when connection not found', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.getConnectionStatus(TENANT_ID, 'nope'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- syncSingleInvoice ----------

  describe('syncSingleInvoice', () => {
    it('enqueues single invoice sync job', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());
      prisma.invoice.findFirst.mockResolvedValue({ id: INVOICE_ID });

      const result = await service.syncSingleInvoice(
        TENANT_ID,
        CONNECTION_ID,
        INVOICE_ID,
      );

      expect(result).toEqual({
        success: true,
        message: 'Invoice sync job enqueued',
        invoiceId: INVOICE_ID,
      });
      expect(queue.add).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when connection not active', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.syncSingleInvoice(TENANT_ID, CONNECTION_ID, INVOICE_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when invoice not found', async () => {
      prisma.accountingConnection.findFirst.mockResolvedValue(makeConnection());
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.syncSingleInvoice(TENANT_ID, CONNECTION_ID, INVOICE_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- getTokensFromConnection ----------

  describe('getTokensFromConnection', () => {
    it('maps QuickBooks connection to AccountingTokens with realmId', () => {
      const tokens = service.getTokensFromConnection({
        accessToken: 'at',
        refreshToken: 'rt',
        tokenExpiresAt: new Date('2026-06-01'),
        companyId: 'realm-1',
        provider: 'QUICKBOOKS',
      });

      expect(tokens.realmId).toBe('realm-1');
      expect(tokens.tenantId).toBeUndefined();
    });

    it('maps Xero connection to AccountingTokens with tenantId', () => {
      const tokens = service.getTokensFromConnection({
        accessToken: 'at',
        refreshToken: null,
        tokenExpiresAt: null,
        companyId: 'xero-tenant',
        provider: 'XERO',
      });

      expect(tokens.tenantId).toBe('xero-tenant');
      expect(tokens.realmId).toBeUndefined();
      expect(tokens.refreshToken).toBe('');
      expect(tokens.expiresAt).toEqual(new Date(0));
    });
  });

  // ---------- getProvider ----------

  describe('getProvider', () => {
    it('returns QuickBooks provider for QUICKBOOKS', () => {
      const provider = service.getProvider('QUICKBOOKS');
      expect(provider).toBe(quickBooksProvider);
    });

    it('returns Xero provider for XERO', () => {
      const provider = service.getProvider('XERO');
      expect(provider).toBe(xeroProvider);
    });

    it('is case-insensitive', () => {
      const provider = service.getProvider('quickbooks');
      expect(provider).toBe(quickBooksProvider);
    });

    it('throws BadRequestException for unsupported provider', () => {
      expect(() => service.getProvider('SAGE')).toThrow(BadRequestException);
    });
  });
});
