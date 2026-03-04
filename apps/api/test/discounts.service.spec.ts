import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DiscountsService } from '@/discounts/discounts.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const DISCOUNT_ID = 'discount-001';
const SESSION_ID = 'session-001';

function makePrisma() {
  return {
    discount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bookingSession: {
      findUnique: vi.fn(),
    },
  };
}

function makeDiscount(overrides: Record<string, unknown> = {}) {
  return {
    id: DISCOUNT_ID,
    tenantId: TENANT_ID,
    code: 'SUMMER20',
    name: 'SUMMER20',
    type: 'PERCENTAGE',
    value: 20,
    application: 'CODE_REQUIRED',
    isActive: true,
    validFrom: null,
    validUntil: null,
    usageLimit: null,
    usageCount: 0,
    minOrderAmount: null,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DiscountsService', () => {
  let service: DiscountsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DiscountsService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return an array of discounts for the tenant', async () => {
      const discounts = [makeDiscount(), makeDiscount({ id: 'discount-002', code: 'WINTER10' })];
      prisma.discount.findMany.mockResolvedValue(discounts);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual(discounts);
      expect(result).toHaveLength(2);
      expect(prisma.discount.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no discounts exist', async () => {
      prisma.discount.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    const createDto = {
      code: 'summer20',
      type: 'PERCENTAGE' as const,
      value: 20,
    };

    it('should create a discount with uppercased code', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);
      const created = makeDiscount();
      prisma.discount.create.mockResolvedValue(created);

      const result = await service.create(TENANT_ID, createDto);

      expect(result).toEqual(created);
      expect(prisma.discount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          code: 'SUMMER20',
          name: 'SUMMER20',
          type: 'PERCENTAGE',
          value: 20,
        }),
      });
    });

    it('should throw ConflictException if code already exists for tenant', async () => {
      prisma.discount.findFirst.mockResolvedValue(makeDiscount());

      await expect(service.create(TENANT_ID, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.discount.create).not.toHaveBeenCalled();
    });

    it('should set default application to CODE_REQUIRED when not provided', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);
      prisma.discount.create.mockResolvedValue(makeDiscount());

      await service.create(TENANT_ID, createDto);

      expect(prisma.discount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          application: 'CODE_REQUIRED',
        }),
      });
    });

    it('should use provided application when specified', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);
      prisma.discount.create.mockResolvedValue(
        makeDiscount({ application: 'AUTOMATIC' }),
      );

      await service.create(TENANT_ID, { ...createDto, application: 'AUTOMATIC' });

      expect(prisma.discount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          application: 'AUTOMATIC',
        }),
      });
    });

    it('should pass validFrom, validTo, maxUses, and minBookingAmount to create', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);
      prisma.discount.create.mockResolvedValue(makeDiscount());

      await service.create(TENANT_ID, {
        ...createDto,
        validFrom: '2026-04-01T00:00:00.000Z',
        validTo: '2026-06-30T23:59:59.999Z',
        maxUses: 100,
        minBookingAmount: 5000,
      });

      expect(prisma.discount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          validFrom: new Date('2026-04-01T00:00:00.000Z'),
          validUntil: new Date('2026-06-30T23:59:59.999Z'),
          usageLimit: 100,
          minOrderAmount: 5000,
        }),
      });
    });

    it('should set isActive to true by default', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);
      prisma.discount.create.mockResolvedValue(makeDiscount());

      await service.create(TENANT_ID, createDto);

      expect(prisma.discount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update a discount successfully', async () => {
      const existing = makeDiscount();
      prisma.discount.findFirst.mockResolvedValue(existing);
      const updated = makeDiscount({ value: 25 });
      prisma.discount.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, DISCOUNT_ID, { value: 25 });

      expect(result).toEqual(updated);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id: DISCOUNT_ID },
        data: expect.objectContaining({ value: 25 }),
      });
    });

    it('should throw NotFoundException if discount not found', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'bad-id', { value: 25 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.discount.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new code conflicts with another discount', async () => {
      const existing = makeDiscount();
      // First call: find the discount being updated
      prisma.discount.findFirst.mockResolvedValueOnce(existing);
      // Second call: find conflict with another discount
      prisma.discount.findFirst.mockResolvedValueOnce(
        makeDiscount({ id: 'discount-other', code: 'WINTER10' }),
      );

      await expect(
        service.update(TENANT_ID, DISCOUNT_ID, { code: 'winter10' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.discount.update).not.toHaveBeenCalled();
    });

    it('should uppercase code when updating', async () => {
      const existing = makeDiscount();
      prisma.discount.findFirst.mockResolvedValueOnce(existing);
      // No conflict
      prisma.discount.findFirst.mockResolvedValueOnce(null);
      prisma.discount.update.mockResolvedValue(
        makeDiscount({ code: 'NEWCODE', name: 'NEWCODE' }),
      );

      await service.update(TENANT_ID, DISCOUNT_ID, { code: 'newcode' });

      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id: DISCOUNT_ID },
        data: expect.objectContaining({
          code: 'NEWCODE',
          name: 'NEWCODE',
        }),
      });
    });

    it('should not check code uniqueness when code is not being updated', async () => {
      const existing = makeDiscount();
      prisma.discount.findFirst.mockResolvedValueOnce(existing);
      prisma.discount.update.mockResolvedValue(
        makeDiscount({ isActive: false }),
      );

      await service.update(TENANT_ID, DISCOUNT_ID, { isActive: false });

      // findFirst called only once (to find the discount), not a second time for code conflict
      expect(prisma.discount.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // deactivate
  // -----------------------------------------------------------------------

  describe('deactivate', () => {
    it('should deactivate a discount successfully', async () => {
      const existing = makeDiscount();
      prisma.discount.findFirst.mockResolvedValue(existing);
      const deactivated = makeDiscount({ isActive: false });
      prisma.discount.update.mockResolvedValue(deactivated);

      const result = await service.deactivate(TENANT_ID, DISCOUNT_ID);

      expect(result).toEqual(deactivated);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id: DISCOUNT_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if discount not found', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(TENANT_ID, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.discount.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // validateCode
  // -----------------------------------------------------------------------

  describe('validateCode', () => {
    it('should return discount details for a valid code', async () => {
      prisma.discount.findFirst.mockResolvedValue(makeDiscount());

      const result = await service.validateCode(TENANT_ID, 'SUMMER20');

      expect(result).toEqual({
        id: DISCOUNT_ID,
        code: 'SUMMER20',
        type: 'PERCENTAGE',
        value: 20,
        application: 'CODE_REQUIRED',
      });
    });

    it('should throw BadRequestException for non-existent code', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);

      await expect(
        service.validateCode(TENANT_ID, 'NONEXISTENT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for inactive code', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ isActive: false }),
      );

      await expect(
        service.validateCode(TENANT_ID, 'SUMMER20'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for code not yet valid (future validFrom)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ validFrom: futureDate }),
      );

      await expect(
        service.validateCode(TENANT_ID, 'SUMMER20'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired code (past validUntil)', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ validUntil: pastDate }),
      );

      await expect(
        service.validateCode(TENANT_ID, 'SUMMER20'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when usage limit reached', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ usageLimit: 10, usageCount: 10 }),
      );

      await expect(
        service.validateCode(TENANT_ID, 'SUMMER20'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw when usageCount is below usageLimit', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ usageLimit: 10, usageCount: 5 }),
      );

      const result = await service.validateCode(TENANT_ID, 'SUMMER20');

      expect(result.code).toBe('SUMMER20');
    });

    it('should throw BadRequestException when booking amount below minimum', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ minOrderAmount: 5000 }),
      );

      await expect(
        service.validateCode(TENANT_ID, 'SUMMER20', 3000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw when booking amount meets minimum', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ minOrderAmount: 5000 }),
      );

      const result = await service.validateCode(TENANT_ID, 'SUMMER20', 6000);

      expect(result.code).toBe('SUMMER20');
    });

    it('should not check minOrderAmount when bookingAmount is undefined', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ minOrderAmount: 5000 }),
      );

      const result = await service.validateCode(TENANT_ID, 'SUMMER20');

      expect(result.code).toBe('SUMMER20');
    });

    it('should perform case-insensitive code matching (converts to uppercase)', async () => {
      prisma.discount.findFirst.mockResolvedValue(makeDiscount());

      await service.validateCode(TENANT_ID, 'summer20');

      expect(prisma.discount.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, code: 'SUMMER20' },
      });
    });

    it('should pass when validFrom is in the past', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ validFrom: pastDate }),
      );

      const result = await service.validateCode(TENANT_ID, 'SUMMER20');

      expect(result.code).toBe('SUMMER20');
    });

    it('should pass when validUntil is in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ validUntil: futureDate }),
      );

      const result = await service.validateCode(TENANT_ID, 'SUMMER20');

      expect(result.code).toBe('SUMMER20');
    });

    it('should pass when usageLimit is null (unlimited)', async () => {
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ usageLimit: null, usageCount: 9999 }),
      );

      const result = await service.validateCode(TENANT_ID, 'SUMMER20');

      expect(result.code).toBe('SUMMER20');
    });
  });

  // -----------------------------------------------------------------------
  // validateForSession
  // -----------------------------------------------------------------------

  describe('validateForSession', () => {
    it('should delegate to validateCode with session tenantId and service basePrice', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        tenantId: TENANT_ID,
        service: { basePrice: 5000 },
      });
      prisma.discount.findFirst.mockResolvedValue(makeDiscount());

      const result = await service.validateForSession(SESSION_ID, 'summer20');

      expect(result).toEqual({
        id: DISCOUNT_ID,
        code: 'SUMMER20',
        type: 'PERCENTAGE',
        value: 20,
        application: 'CODE_REQUIRED',
      });
      expect(prisma.bookingSession.findUnique).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        include: { service: { select: { basePrice: true } } },
      });
      expect(prisma.discount.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, code: 'SUMMER20' },
      });
    });

    it('should throw NotFoundException if session not found', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue(null);

      await expect(
        service.validateForSession('bad-session', 'SUMMER20'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.discount.findFirst).not.toHaveBeenCalled();
    });

    it('should pass service basePrice as bookingAmount', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        tenantId: TENANT_ID,
        service: { basePrice: 3000 },
      });
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ minOrderAmount: 5000 }),
      );

      await expect(
        service.validateForSession(SESSION_ID, 'SUMMER20'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass undefined as bookingAmount when session has no service', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        tenantId: TENANT_ID,
        service: null,
      });
      // Discount has a minOrderAmount, but since bookingAmount is undefined it should still pass
      prisma.discount.findFirst.mockResolvedValue(
        makeDiscount({ minOrderAmount: 5000 }),
      );

      const result = await service.validateForSession(SESSION_ID, 'SUMMER20');

      expect(result.code).toBe('SUMMER20');
    });
  });
});
