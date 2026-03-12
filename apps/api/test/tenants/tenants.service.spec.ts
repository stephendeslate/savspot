import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

// Mock @savspot/shared before importing the service (dynamic import resolution)
vi.mock('@savspot/shared', () => ({
  BUSINESS_PRESETS: {
    SALON: {
      default_services: [
        { name: 'Haircut', duration_minutes: 30, base_price: 25 },
      ],
      default_availability: [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
      ],
      default_workflows: [
        {
          trigger: 'BOOKING_CREATED',
          action: 'SEND_EMAIL',
          delay_minutes: 0,
          description: 'Send confirmation',
        },
      ],
    },
  },
}));

import { TenantsService } from '@/tenants/tenants.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    service: {
      count: vi.fn(),
      create: vi.fn(),
    },
    availabilityRule: {
      create: vi.fn(),
    },
    workflowAutomation: {
      create: vi.fn(),
    },
    dataRequest: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  };
}

function makeSlugService() {
  return {
    generateSlug: vi.fn().mockResolvedValue('test-salon'),
  };
}

function makeGdprQueue() {
  return {
    add: vi.fn(),
  };
}

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Test Salon',
    slug: 'test-salon',
    description: null,
    category: 'SALON',
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'US',
    contactEmail: 'test@example.com',
    contactPhone: null,
    status: 'ACTIVE',
    isPublished: false,
    ...overrides,
  };
}

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: ReturnType<typeof makePrisma>;
  let slugService: ReturnType<typeof makeSlugService>;
  let gdprQueue: ReturnType<typeof makeGdprQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    slugService = makeSlugService();
    gdprQueue = makeGdprQueue();
    service = new TenantsService(
      prisma as never,
      slugService as never,
      gdprQueue as never,
    );
  });

  // ---------- create ----------

  describe('create', () => {
    it('creates tenant with OWNER membership via transaction', async () => {
      const createdTenant = makeTenant({
        memberships: [{ id: 'mem-1', userId: USER_ID, role: 'OWNER' }],
      });
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          $executeRaw: vi.fn(),
          tenant: {
            create: vi.fn().mockResolvedValue(createdTenant),
          },
        };
        return fn(tx);
      });

      const dto = {
        name: 'Test Salon',
        category: 'SALON',
        timezone: 'America/New_York',
        currency: 'USD',
        country: 'US',
        contactEmail: 'test@example.com',
      };

      const result = await service.create(USER_ID, dto as never);

      expect(result.name).toBe('Test Salon');
      expect(slugService.generateSlug).toHaveBeenCalledWith('Test Salon');
    });
  });

  // ---------- findById ----------

  describe('findById', () => {
    it('returns tenant when found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());

      const result = await service.findById(TENANT_ID);

      expect(result.id).toBe(TENANT_ID);
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('updates tenant fields', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.tenant.update.mockResolvedValue(makeTenant({ name: 'Updated Salon' }));

      const result = await service.update(TENANT_ID, { name: 'Updated Salon' } as never);

      expect(result.name).toBe('Updated Salon');
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- requestExport ----------

  describe('requestExport', () => {
    it('creates a data export request and enqueues job', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      const dataRequest = { id: 'dr-001', status: 'PENDING' };
      prisma.dataRequest.create.mockResolvedValue(dataRequest);

      const result = await service.requestExport(TENANT_ID, USER_ID);

      expect(result.id).toBe('dr-001');
      expect(gdprQueue.add).toHaveBeenCalledWith(
        'processDataExportRequest',
        expect.objectContaining({ tenantId: TENANT_ID }),
        expect.any(Object),
      );
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.requestExport('nonexistent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- deactivate ----------

  describe('deactivate', () => {
    it('deactivates tenant and schedules deletion', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.tenant.update.mockResolvedValue(makeTenant({ status: 'DEACTIVATED' }));
      prisma.dataRequest.create.mockResolvedValue({ id: 'dr-001' });

      const result = await service.deactivate(TENANT_ID, USER_ID);

      expect(result.status).toBe('DEACTIVATED');
      expect(result.exportRequestId).toBe('dr-001');
      expect(gdprQueue.add).toHaveBeenCalledTimes(2); // export + deletion
    });

    it('throws ConflictException when tenant already deactivated', async () => {
      prisma.tenant.findUnique.mockResolvedValue(
        makeTenant({ status: 'DEACTIVATED' }),
      );

      await expect(
        service.deactivate(TENANT_ID, USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.deactivate('nonexistent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('schedules deletion with a 30-day delay', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.tenant.update.mockResolvedValue(makeTenant({ status: 'DEACTIVATED' }));
      prisma.dataRequest.create.mockResolvedValue({ id: 'dr-001' });

      await service.deactivate(TENANT_ID, USER_ID);

      const deletionCall = gdprQueue.add.mock.calls.find(
        (call: unknown[]) => call[0] === 'processAccountDeletion',
      );
      expect(deletionCall).toBeDefined();
      const opts = deletionCall![2] as { delay: number };
      expect(opts.delay).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });
});
