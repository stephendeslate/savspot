import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaitlistEventListener } from '../src/waitlist/waitlist-event.listener';
import type { BookingCancelledPayload } from '../src/events/event.types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeWaitlistService() {
  return {
    findMatchingEntries: vi.fn().mockResolvedValue([]),
    markNotified: vi.fn().mockResolvedValue({}),
  };
}

function makeCommunicationsService() {
  return {
    createAndSend: vi.fn().mockResolvedValue({}),
  };
}

const payload: BookingCancelledPayload = {
  bookingId: 'booking-001',
  tenantId: 'tenant-001',
  serviceId: 'service-001',
  serviceName: 'Haircut',
  startTime: new Date('2026-03-25T10:00:00Z'),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WaitlistEventListener', () => {
  let listener: WaitlistEventListener;
  let waitlistService: ReturnType<typeof makeWaitlistService>;
  let commsService: ReturnType<typeof makeCommunicationsService>;

  beforeEach(() => {
    waitlistService = makeWaitlistService();
    commsService = makeCommunicationsService();
    listener = new WaitlistEventListener(
      waitlistService as never,
      commsService as never,
    );
  });

  it('should do nothing when no waitlist entries match', async () => {
    waitlistService.findMatchingEntries.mockResolvedValue([]);

    await listener.handleBookingCancelled(payload);

    expect(waitlistService.markNotified).not.toHaveBeenCalled();
    expect(commsService.createAndSend).not.toHaveBeenCalled();
  });

  it('should notify the first date-specific match', async () => {
    const entry = {
      id: 'wl-001',
      clientEmail: 'john@example.com',
      clientName: 'John Doe',
      tenantId: 'tenant-001',
    };
    waitlistService.findMatchingEntries.mockResolvedValueOnce([entry]);

    await listener.handleBookingCancelled(payload);

    expect(waitlistService.markNotified).toHaveBeenCalledWith('wl-001');
    expect(commsService.createAndSend).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-001',
        recipientEmail: 'john@example.com',
        templateKey: 'waitlist-slot-available',
        templateData: {
          serviceName: 'Haircut',
          clientName: 'John Doe',
        },
      }),
    );
  });

  it('should fall back to general entries when no date-specific match', async () => {
    const generalEntry = {
      id: 'wl-002',
      clientEmail: 'jane@example.com',
      clientName: 'Jane',
      tenantId: 'tenant-001',
    };
    // First call (date-specific): no matches
    waitlistService.findMatchingEntries.mockResolvedValueOnce([]);
    // Second call (general): one match
    waitlistService.findMatchingEntries.mockResolvedValueOnce([generalEntry]);

    await listener.handleBookingCancelled(payload);

    expect(waitlistService.findMatchingEntries).toHaveBeenCalledTimes(2);
    expect(waitlistService.markNotified).toHaveBeenCalledWith('wl-002');
    expect(commsService.createAndSend).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'jane@example.com',
      }),
    );
  });

  it('should not throw when notification sending fails', async () => {
    const entry = {
      id: 'wl-001',
      clientEmail: 'fail@example.com',
      clientName: 'Fail',
      tenantId: 'tenant-001',
    };
    waitlistService.findMatchingEntries.mockResolvedValueOnce([entry]);
    commsService.createAndSend.mockRejectedValue(new Error('SMTP error'));

    // Should not throw
    await expect(
      listener.handleBookingCancelled(payload),
    ).resolves.toBeUndefined();
  });

  it('should not throw when waitlist query fails', async () => {
    waitlistService.findMatchingEntries.mockRejectedValue(
      new Error('DB error'),
    );

    await expect(
      listener.handleBookingCancelled(payload),
    ).resolves.toBeUndefined();
  });
});
