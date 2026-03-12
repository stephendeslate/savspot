import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AvailabilityRulesService } from '@/availability/availability-rules.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const OTHER_TENANT_ID = 'tenant-002';
const RULE_ID = 'rule-001';
const SERVICE_ID = 'service-001';
const VENUE_ID = 'venue-001';

/**
 * Create a "Time" field (Date on 1970-01-01) from hours and minutes.
 * Mirrors the parseTime() logic in the service.
 */
function timeField(hours: number, minutes = 0): Date {
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: RULE_ID,
    tenantId: TENANT_ID,
    dayOfWeek: 1,
    startTime: timeField(9, 0),
    endTime: timeField(17, 0),
    serviceId: null,
    venueId: null,
    isActive: true,
    ...overrides,
  };
}

function makePrisma() {
  return {
    availabilityRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AvailabilityRulesService', () => {
  let service: AvailabilityRulesService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    prisma = makePrisma();
    redis = makeRedis();
    service = new AvailabilityRulesService(prisma as never, redis as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('returns all rules for a tenant with serialized times', async () => {
      const rules = [
        makeRule({ dayOfWeek: 1, startTime: timeField(9), endTime: timeField(12) }),
        makeRule({ id: 'rule-002', dayOfWeek: 2, startTime: timeField(10), endTime: timeField(18) }),
      ];
      prisma.availabilityRule.findMany.mockResolvedValue(rules);

      const result = await service.findAll(TENANT_ID);

      expect(prisma.availabilityRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ startTime: expect.any(String), endTime: expect.any(String) });
    });

    it('returns an empty array when no rules exist', async () => {
      prisma.availabilityRule.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('filters by serviceId when provided', async () => {
      prisma.availabilityRule.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, SERVICE_ID);

      expect(prisma.availabilityRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, serviceId: SERVICE_ID },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('filters by venueId when provided', async () => {
      prisma.availabilityRule.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, undefined, VENUE_ID);

      expect(prisma.availabilityRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, venueId: VENUE_ID },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('filters by both serviceId and venueId when provided', async () => {
      prisma.availabilityRule.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, SERVICE_ID, VENUE_ID);

      expect(prisma.availabilityRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, serviceId: SERVICE_ID, venueId: VENUE_ID },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('serializes startTime and endTime from Date to HH:mm string', async () => {
      prisma.availabilityRule.findMany.mockResolvedValue([
        makeRule({ startTime: timeField(8, 30), endTime: timeField(14, 45) }),
      ]);

      const result = await service.findAll(TENANT_ID);

      // formatTime uses getUTCHours/getUTCMinutes, so we need to account for
      // the offset between local time and UTC. timeField creates local dates.
      expect(result[0]).toHaveProperty('startTime');
      expect(result[0]).toHaveProperty('endTime');
      expect(typeof result[0]!.startTime).toBe('string');
      expect(typeof result[0]!.endTime).toBe('string');
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('creates a rule with required fields and returns serialized times', async () => {
      const created = makeRule();
      prisma.availabilityRule.create.mockResolvedValue(created);

      const result = await service.create(TENANT_ID, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });

      expect(prisma.availabilityRule.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          dayOfWeek: 1,
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          serviceId: null,
          venueId: null,
        },
      });
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(typeof result.startTime).toBe('string');
    });

    it('includes serviceId and venueId when provided', async () => {
      prisma.availabilityRule.create.mockResolvedValue(
        makeRule({ serviceId: SERVICE_ID, venueId: VENUE_ID }),
      );

      await service.create(TENANT_ID, {
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '15:00',
        serviceId: SERVICE_ID,
        venueId: VENUE_ID,
      });

      expect(prisma.availabilityRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serviceId: SERVICE_ID,
          venueId: VENUE_ID,
        }),
      });
    });

    it('includes isActive when provided in dto', async () => {
      prisma.availabilityRule.create.mockResolvedValue(makeRule({ isActive: false }));

      await service.create(TENANT_ID, {
        dayOfWeek: 0,
        startTime: '08:00',
        endTime: '12:00',
        isActive: false,
      });

      expect(prisma.availabilityRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it('does not include isActive when not provided in dto', async () => {
      prisma.availabilityRule.create.mockResolvedValue(makeRule());

      await service.create(TENANT_ID, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });

      const callData = prisma.availabilityRule.create.mock.calls[0]![0].data;
      expect(callData).not.toHaveProperty('isActive');
    });

    it('passes the correct tenantId to the create call', async () => {
      prisma.availabilityRule.create.mockResolvedValue(
        makeRule({ tenantId: OTHER_TENANT_ID }),
      );

      await service.create(OTHER_TENANT_ID, {
        dayOfWeek: 5,
        startTime: '11:00',
        endTime: '16:00',
      });

      expect(prisma.availabilityRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: OTHER_TENANT_ID }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('updates a rule when it exists for the tenant', async () => {
      const existing = makeRule();
      const updated = makeRule({ dayOfWeek: 3 });
      prisma.availabilityRule.findFirst.mockResolvedValue(existing);
      prisma.availabilityRule.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, RULE_ID, { dayOfWeek: 3 });

      expect(prisma.availabilityRule.findFirst).toHaveBeenCalledWith({
        where: { id: RULE_ID, tenantId: TENANT_ID },
      });
      expect(prisma.availabilityRule.update).toHaveBeenCalledWith({
        where: { id: RULE_ID },
        data: { dayOfWeek: 3 },
      });
      expect(result).toHaveProperty('startTime');
      expect(typeof result.startTime).toBe('string');
    });

    it('throws NotFoundException when rule does not exist', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, RULE_ID, { dayOfWeek: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when rule belongs to a different tenant', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(null);

      await expect(
        service.update(OTHER_TENANT_ID, RULE_ID, { dayOfWeek: 3 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.availabilityRule.findFirst).toHaveBeenCalledWith({
        where: { id: RULE_ID, tenantId: OTHER_TENANT_ID },
      });
    });

    it('only includes provided fields in the update data', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(makeRule());
      prisma.availabilityRule.update.mockResolvedValue(makeRule({ isActive: false }));

      await service.update(TENANT_ID, RULE_ID, { isActive: false });

      expect(prisma.availabilityRule.update).toHaveBeenCalledWith({
        where: { id: RULE_ID },
        data: { isActive: false },
      });
    });

    it('converts startTime and endTime strings to Date objects in update', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(makeRule());
      prisma.availabilityRule.update.mockResolvedValue(
        makeRule({ startTime: timeField(10), endTime: timeField(18) }),
      );

      await service.update(TENANT_ID, RULE_ID, {
        startTime: '10:00',
        endTime: '18:00',
      });

      const callData = prisma.availabilityRule.update.mock.calls[0]![0].data;
      expect(callData.startTime).toBeInstanceOf(Date);
      expect(callData.endTime).toBeInstanceOf(Date);
    });

    it('handles partial update with only serviceId', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(makeRule());
      prisma.availabilityRule.update.mockResolvedValue(
        makeRule({ serviceId: SERVICE_ID }),
      );

      await service.update(TENANT_ID, RULE_ID, { serviceId: SERVICE_ID });

      expect(prisma.availabilityRule.update).toHaveBeenCalledWith({
        where: { id: RULE_ID },
        data: { serviceId: SERVICE_ID },
      });
    });

    it('does not call update when rule is not found', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, RULE_ID, { dayOfWeek: 5 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.availabilityRule.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('deletes a rule when it exists for the tenant', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(makeRule());
      prisma.availabilityRule.delete.mockResolvedValue(makeRule());

      const result = await service.remove(TENANT_ID, RULE_ID);

      expect(prisma.availabilityRule.findFirst).toHaveBeenCalledWith({
        where: { id: RULE_ID, tenantId: TENANT_ID },
      });
      expect(prisma.availabilityRule.delete).toHaveBeenCalledWith({
        where: { id: RULE_ID },
      });
      expect(result).toEqual({ message: 'Availability rule deleted successfully' });
    });

    it('throws NotFoundException when rule does not exist', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, RULE_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when rule belongs to a different tenant', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(OTHER_TENANT_ID, RULE_ID),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.availabilityRule.findFirst).toHaveBeenCalledWith({
        where: { id: RULE_ID, tenantId: OTHER_TENANT_ID },
      });
    });

    it('does not call delete when rule is not found', async () => {
      prisma.availabilityRule.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, RULE_ID),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.availabilityRule.delete).not.toHaveBeenCalled();
    });
  });
});
