import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AvailabilityController } from '@/public-api/v1/controllers/availability.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAvailabilityService() {
  return {
    getAvailableSlots: vi.fn(),
  };
}

function makeReq(apiKey: Record<string, unknown> | undefined = undefined) {
  return { apiKey } as never;
}

const API_KEY = {
  id: 'key-1',
  tenantId: 'tenant-001',
  scopes: ['availability:read'],
  rateLimit: 100,
  createdBy: 'user-001',
  allowedIps: [],
};

describe('AvailabilityController (Public API)', () => {
  let controller: AvailabilityController;
  let availabilityService: ReturnType<typeof makeAvailabilityService>;

  beforeEach(() => {
    availabilityService = makeAvailabilityService();
    controller = new AvailabilityController(availabilityService as never);
  });

  it('returns available slots for a date', async () => {
    availabilityService.getAvailableSlots.mockResolvedValue([
      { startTime: '09:00', endTime: '09:30' },
      { startTime: '10:00', endTime: '10:30' },
    ]);

    const query = { service_id: 'svc-1', date: '2026-04-01' } as never;
    const result = await controller.getAvailability(query, makeReq(API_KEY));

    expect(result.data.slots).toHaveLength(2);
    expect(result.data.date).toBe('2026-04-01');
    expect(result.data.service_id).toBe('svc-1');
  });

  it('defaults guest_count to 1', async () => {
    availabilityService.getAvailableSlots.mockResolvedValue([]);

    const query = { service_id: 'svc-1', date: '2026-04-01' } as never;
    const result = await controller.getAvailability(query, makeReq(API_KEY));

    expect(result.data.guest_count).toBe(1);
  });

  it('uses provided guest_count', async () => {
    availabilityService.getAvailableSlots.mockResolvedValue([]);

    const query = { service_id: 'svc-1', date: '2026-04-01', guest_count: 3 } as never;
    const result = await controller.getAvailability(query, makeReq(API_KEY));

    expect(result.data.guest_count).toBe(3);
  });

  it('throws BadRequestException when no API key on request', async () => {
    const query = { service_id: 'svc-1', date: '2026-04-01' } as never;

    await expect(
      controller.getAvailability(query, makeReq(undefined)),
    ).rejects.toThrow(BadRequestException);
  });
});
