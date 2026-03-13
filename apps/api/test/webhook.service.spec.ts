import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { WebhookService } from '@/workflows/services/webhook.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const ENDPOINT_ID = 'endpoint-001';
const DELIVERY_ID = 'delivery-001';

function makePrisma() {
  return {
    webhookEndpoint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    webhookDelivery: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function makeConfigService() {
  return {
    get: vi.fn().mockReturnValue(undefined),
  };
}

function makeQueue() {
  return {
    add: vi.fn(),
    addBulk: vi.fn(),
  };
}

function makeEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: ENDPOINT_ID,
    tenantId: TENANT_ID,
    url: 'https://example.com/webhook',
    secret: 'whsec_oldsecret1234',
    events: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED'],
    isActive: true,
    description: 'Test endpoint',
    maxAttempts: 5,
    timeoutSeconds: 10,
    failureCount: 0,
    lastFailureAt: null,
    disabledReason: null,
    createdAt: new Date('2026-03-01T12:00:00Z'),
    updatedAt: new Date('2026-03-01T12:00:00Z'),
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: DELIVERY_ID,
    endpointId: ENDPOINT_ID,
    event: 'BOOKING_CONFIRMED',
    idempotencyKey: 'some-uuid',
    payload: { event: 'BOOKING_CONFIRMED', data: {} },
    status: 'PENDING',
    createdAt: new Date('2026-03-01T12:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: ReturnType<typeof makePrisma>;
  let configService: ReturnType<typeof makeConfigService>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    configService = makeConfigService();
    queue = makeQueue();
    service = new WebhookService(prisma as never, configService as never, queue as never);
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe('list', () => {
    it('should return all webhook endpoints for the given tenant', async () => {
      const endpoints = [makeEndpoint(), makeEndpoint({ id: 'endpoint-002' })];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);

      const result = await service.list(TENANT_ID);

      expect(result).toEqual(endpoints);
      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array when tenant has no endpoints', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      const result = await service.list(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should select only the expected fields', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await service.list(TENANT_ID);

      const args = prisma.webhookEndpoint.findMany.mock.calls[0]![0];
      expect(args.select).toEqual({
        id: true,
        url: true,
        events: true,
        isActive: true,
        description: true,
        maxAttempts: true,
        timeoutSeconds: true,
        failureCount: true,
        lastFailureAt: true,
        disabledReason: true,
        createdAt: true,
        updatedAt: true,
      });
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should create an endpoint with a generated secret', async () => {
      const created = makeEndpoint();
      prisma.webhookEndpoint.create.mockResolvedValue(created);

      const result = await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
      });

      expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          url: 'https://example.com/webhook',
          events: ['BOOKING_CONFIRMED'],
          secret: expect.stringMatching(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/),
        }),
      });
      // The returned object should include the plaintext secret
      expect(result.secret).toBeDefined();
      expect(result.secret).toMatch(/^whsec_/);
    });

    it('should use default maxAttempts=5 when not provided', async () => {
      prisma.webhookEndpoint.create.mockResolvedValue(makeEndpoint());

      await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
      });

      const createData = prisma.webhookEndpoint.create.mock.calls[0]![0].data;
      expect(createData.maxAttempts).toBe(5);
    });

    it('should use default timeoutSeconds=10 when not provided', async () => {
      prisma.webhookEndpoint.create.mockResolvedValue(makeEndpoint());

      await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
      });

      const createData = prisma.webhookEndpoint.create.mock.calls[0]![0].data;
      expect(createData.timeoutSeconds).toBe(10);
    });

    it('should use provided maxAttempts and timeoutSeconds', async () => {
      prisma.webhookEndpoint.create.mockResolvedValue(makeEndpoint());

      await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
        maxAttempts: 3,
        timeoutSeconds: 20,
      });

      const createData = prisma.webhookEndpoint.create.mock.calls[0]![0].data;
      expect(createData.maxAttempts).toBe(3);
      expect(createData.timeoutSeconds).toBe(20);
    });

    it('should set description to null when not provided', async () => {
      prisma.webhookEndpoint.create.mockResolvedValue(makeEndpoint());

      await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
      });

      const createData = prisma.webhookEndpoint.create.mock.calls[0]![0].data;
      expect(createData.description).toBeNull();
    });

    it('should use provided description', async () => {
      prisma.webhookEndpoint.create.mockResolvedValue(makeEndpoint());

      await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
        description: 'My webhook',
      });

      const createData = prisma.webhookEndpoint.create.mock.calls[0]![0].data;
      expect(createData.description).toBe('My webhook');
    });

    it('should return the endpoint with the plaintext secret', async () => {
      const created = makeEndpoint({ secret: 'stored-hash' });
      prisma.webhookEndpoint.create.mockResolvedValue(created);

      const result = await service.create(TENANT_ID, {
        url: 'https://example.com/webhook',
        events: ['BOOKING_CONFIRMED'],
      });

      // Secret on the result should be the generated whsec_ secret, not the stored one
      expect(result.secret).toMatch(/^whsec_/);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should throw NotFoundException when endpoint does not exist', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { url: 'https://new.com/hook' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', {}))
        .rejects.toThrow('Webhook endpoint not found');
    });

    it('should update only url when only url is provided', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint({ url: 'https://new.com/hook' }));

      await service.update(ENDPOINT_ID, { url: 'https://new.com/hook' });

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData.url).toBe('https://new.com/hook');
      expect(updateData.events).toBeUndefined();
      expect(updateData.isActive).toBeUndefined();
      expect(updateData.description).toBeUndefined();
    });

    it('should update events when provided', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint());

      await service.update(ENDPOINT_ID, { events: ['PAYMENT_RECEIVED'] });

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData.events).toEqual(['PAYMENT_RECEIVED']);
    });

    it('should clear disabledReason and failureCount when re-enabling', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(
        makeEndpoint({ isActive: false, disabledReason: 'Too many failures' }),
      );
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint({ isActive: true }));

      await service.update(ENDPOINT_ID, { isActive: true });

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData.isActive).toBe(true);
      expect(updateData.disabledReason).toBeNull();
      expect(updateData.failureCount).toBe(0);
    });

    it('should not clear disabledReason when disabling', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint({ isActive: false }));

      await service.update(ENDPOINT_ID, { isActive: false });

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData.isActive).toBe(false);
      expect(updateData.disabledReason).toBeUndefined();
      expect(updateData.failureCount).toBeUndefined();
    });

    it('should update description when provided', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint());

      await service.update(ENDPOINT_ID, { description: 'Updated description' });

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData.description).toBe('Updated description');
    });

    it('should select the correct fields in the update response', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint());

      await service.update(ENDPOINT_ID, { url: 'https://new.com/hook' });

      const args = prisma.webhookEndpoint.update.mock.calls[0]![0];
      expect(args.select).toEqual({
        id: true,
        url: true,
        events: true,
        isActive: true,
        description: true,
        maxAttempts: true,
        timeoutSeconds: true,
        failureCount: true,
        lastFailureAt: true,
        disabledReason: true,
        createdAt: true,
        updatedAt: true,
      });
    });

    it('should pass empty data object when no fields are provided in dto', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint());

      await service.update(ENDPOINT_ID, {});

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData).toEqual({});
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  describe('delete', () => {
    it('should throw NotFoundException when endpoint does not exist', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent'))
        .rejects.toThrow('Webhook endpoint not found');
    });

    it('should delete pending deliveries and the endpoint in a transaction', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.$transaction.mockResolvedValue(undefined);

      await service.delete(ENDPOINT_ID);

      expect(prisma.$transaction).toHaveBeenCalledWith([
        prisma.webhookDelivery.deleteMany({
          where: { endpointId: ENDPOINT_ID, status: 'PENDING' },
        }),
        prisma.webhookEndpoint.delete({ where: { id: ENDPOINT_ID } }),
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // sendTest
  // -----------------------------------------------------------------------

  describe('sendTest', () => {
    it('should throw NotFoundException when endpoint does not exist', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(service.sendTest('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should create a delivery with event=test and queue it', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookDelivery.create.mockResolvedValue(makeDelivery({ id: 'del-1', event: 'test' }));
      queue.add.mockResolvedValue(undefined);

      const result = await service.sendTest(ENDPOINT_ID);

      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endpointId: ENDPOINT_ID,
          event: 'test',
          status: 'PENDING',
          idempotencyKey: expect.any(String),
          payload: expect.objectContaining({
            event: 'test',
            data: { message: 'This is a test webhook delivery from SavSpot' },
          }),
        }),
      });

      expect(queue.add).toHaveBeenCalledWith('dispatchWebhook', {
        deliveryId: 'del-1',
      });

      expect(result).toEqual({ deliveryId: 'del-1', status: 'queued' });
    });

    it('should include a timestamp in the test payload', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookDelivery.create.mockResolvedValue(makeDelivery());
      queue.add.mockResolvedValue(undefined);

      await service.sendTest(ENDPOINT_ID);

      const payload = prisma.webhookDelivery.create.mock.calls[0]![0].data.payload;
      expect(payload.timestamp).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // rotateSecret
  // -----------------------------------------------------------------------

  describe('rotateSecret', () => {
    it('should throw NotFoundException when endpoint does not exist', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(service.rotateSecret('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should generate a new secret and store the old one as previousSecret', async () => {
      const oldSecret = 'whsec_oldsecret1234';
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint({ secret: oldSecret }));
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint());

      const result = await service.rotateSecret(ENDPOINT_ID);

      expect(result.secret).toMatch(/^whsec_[a-f0-9]{64}$/);
      expect(result.secret).not.toBe(oldSecret);

      const updateData = prisma.webhookEndpoint.update.mock.calls[0]![0].data;
      expect(updateData.previousSecret).toBe(oldSecret);
      expect(updateData.secret).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      expect(updateData.secretRotatedAt).toBeInstanceOf(Date);
    });

    it('should return an object with the new secret', async () => {
      prisma.webhookEndpoint.findUnique.mockResolvedValue(makeEndpoint());
      prisma.webhookEndpoint.update.mockResolvedValue(makeEndpoint());

      const result = await service.rotateSecret(ENDPOINT_ID);

      expect(result).toHaveProperty('secret');
      expect(typeof result.secret).toBe('string');
    });
  });

  // -----------------------------------------------------------------------
  // listDeliveries
  // -----------------------------------------------------------------------

  describe('listDeliveries', () => {
    it('should return paginated deliveries with meta', async () => {
      const deliveries = [makeDelivery()];
      prisma.webhookDelivery.findMany.mockResolvedValue(deliveries);
      prisma.webhookDelivery.count.mockResolvedValue(1);

      const result = await service.listDeliveries(ENDPOINT_ID, {});

      expect(result.data).toEqual(deliveries);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(0);

      const result = await service.listDeliveries(ENDPOINT_ID, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should calculate totalPages correctly', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(45);

      const result = await service.listDeliveries(ENDPOINT_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3); // Math.ceil(45/20)
    });

    it('should apply skip/take for pagination', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(0);

      await service.listDeliveries(ENDPOINT_ID, { page: 3, limit: 10 });

      const findManyArgs = prisma.webhookDelivery.findMany.mock.calls[0]![0];
      expect(findManyArgs.skip).toBe(20); // (3-1)*10
      expect(findManyArgs.take).toBe(10);
    });

    it('should filter by status when provided', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(0);

      await service.listDeliveries(ENDPOINT_ID, { status: 'FAILED' });

      const findManyArgs = prisma.webhookDelivery.findMany.mock.calls[0]![0];
      expect(findManyArgs.where.status).toBe('FAILED');
    });

    it('should not add status filter when status is not provided', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(0);

      await service.listDeliveries(ENDPOINT_ID, {});

      const findManyArgs = prisma.webhookDelivery.findMany.mock.calls[0]![0];
      expect(findManyArgs.where.status).toBeUndefined();
    });

    it('should order deliveries by createdAt desc', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(0);

      await service.listDeliveries(ENDPOINT_ID, {});

      const findManyArgs = prisma.webhookDelivery.findMany.mock.calls[0]![0];
      expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should return totalPages=0 when there are no deliveries', async () => {
      prisma.webhookDelivery.findMany.mockResolvedValue([]);
      prisma.webhookDelivery.count.mockResolvedValue(0);

      const result = await service.listDeliveries(ENDPOINT_ID, {});

      expect(result.meta.totalPages).toBe(0); // Math.ceil(0/20)
    });
  });

  // -----------------------------------------------------------------------
  // dispatch
  // -----------------------------------------------------------------------

  describe('dispatch', () => {
    it('should return early when no active endpoints match the event', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', { foo: 'bar' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(queue.addBulk).not.toHaveBeenCalled();
    });

    it('should query only active endpoints that have the event', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', {});

      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          events: { has: 'BOOKING_CONFIRMED' },
        },
      });
    });

    it('should create deliveries for each matching endpoint in a transaction', async () => {
      const endpoints = [
        makeEndpoint({ id: 'ep-1' }),
        makeEndpoint({ id: 'ep-2' }),
      ];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);

      const deliveries = [
        makeDelivery({ id: 'del-1', endpointId: 'ep-1' }),
        makeDelivery({ id: 'del-2', endpointId: 'ep-2' }),
      ];
      prisma.$transaction.mockResolvedValue(deliveries);

      // Mock the create calls that are passed to $transaction
      prisma.webhookDelivery.create.mockImplementation((args: Record<string, unknown>) => args);

      queue.addBulk.mockResolvedValue(undefined);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', { key: 'value' });

      // $transaction is called with an array of create operations
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything(), expect.anything()]),
      );
    });

    it('should queue dispatchWebhook jobs via addBulk for each delivery', async () => {
      const endpoints = [makeEndpoint({ id: 'ep-1' })];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);

      const deliveries = [makeDelivery({ id: 'del-1' })];
      prisma.$transaction.mockResolvedValue(deliveries);
      prisma.webhookDelivery.create.mockImplementation((args: Record<string, unknown>) => args);
      queue.addBulk.mockResolvedValue(undefined);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', {});

      expect(queue.addBulk).toHaveBeenCalledWith([
        { name: 'dispatchWebhook', data: { deliveryId: 'del-1' } },
      ]);
    });

    it('should queue multiple jobs when multiple endpoints match', async () => {
      const endpoints = [
        makeEndpoint({ id: 'ep-1' }),
        makeEndpoint({ id: 'ep-2' }),
        makeEndpoint({ id: 'ep-3' }),
      ];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);

      const deliveries = [
        makeDelivery({ id: 'del-1' }),
        makeDelivery({ id: 'del-2' }),
        makeDelivery({ id: 'del-3' }),
      ];
      prisma.$transaction.mockResolvedValue(deliveries);
      prisma.webhookDelivery.create.mockImplementation((args: Record<string, unknown>) => args);
      queue.addBulk.mockResolvedValue(undefined);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', {});

      expect(queue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          { name: 'dispatchWebhook', data: { deliveryId: 'del-1' } },
          { name: 'dispatchWebhook', data: { deliveryId: 'del-2' } },
          { name: 'dispatchWebhook', data: { deliveryId: 'del-3' } },
        ]),
      );
    });

    it('should include event, entityId, timestamp, and data in the delivery payload', async () => {
      const endpoints = [makeEndpoint({ id: 'ep-1' })];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);
      prisma.$transaction.mockResolvedValue([makeDelivery()]);
      prisma.webhookDelivery.create.mockImplementation((args: Record<string, unknown>) => args);
      queue.addBulk.mockResolvedValue(undefined);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', { foo: 'bar' });

      const createArgs = prisma.webhookDelivery.create.mock.calls[0]![0];
      expect(createArgs.data.payload).toEqual(
        expect.objectContaining({
          event: 'BOOKING_CONFIRMED',
          entityId: 'entity-1',
          timestamp: expect.any(String),
          data: { foo: 'bar' },
        }),
      );
    });

    it('should set status to PENDING for each delivery', async () => {
      const endpoints = [makeEndpoint({ id: 'ep-1' })];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);
      prisma.$transaction.mockResolvedValue([makeDelivery()]);
      prisma.webhookDelivery.create.mockImplementation((args: Record<string, unknown>) => args);
      queue.addBulk.mockResolvedValue(undefined);

      await service.dispatch(TENANT_ID, 'BOOKING_CONFIRMED', 'entity-1', {});

      const createArgs = prisma.webhookDelivery.create.mock.calls[0]![0];
      expect(createArgs.data.status).toBe('PENDING');
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------

  describe('tenant isolation', () => {
    it('should scope list to the provided tenantId', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await service.list('tenant-other');

      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-other' },
        }),
      );
    });

    it('should scope dispatch to the provided tenantId', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await service.dispatch('tenant-other', 'BOOKING_CONFIRMED', 'e-1', {});

      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-other' }),
        }),
      );
    });

    it('should associate created endpoint with the correct tenantId', async () => {
      prisma.webhookEndpoint.create.mockResolvedValue(makeEndpoint({ tenantId: 'tenant-other' }));

      await service.create('tenant-other', {
        url: 'https://example.com/hook',
        events: ['BOOKING_CONFIRMED'],
      });

      const createData = prisma.webhookEndpoint.create.mock.calls[0]![0].data;
      expect(createData.tenantId).toBe('tenant-other');
    });
  });
});
