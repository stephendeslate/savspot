import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunicationsService } from '@/communications/communications.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const RECIPIENT_ID = 'user-001';
const COMM_ID = 'comm-001';

function makePrisma() {
  return {
    communication: { create: vi.fn() },
    tenant: { findUniqueOrThrow: vi.fn() },
  };
}

function makeConfig() {
  return {
    get: vi.fn((_key: string, fallback?: unknown) => fallback ?? ''),
  };
}

function makeQueue() {
  return {
    add: vi.fn(),
  };
}

/** Standard template data used across multiple tests. */
function baseTemplateData(overrides: Record<string, unknown> = {}) {
  return {
    businessName: 'Glow Studio',
    clientName: 'Alice Johnson',
    serviceName: 'Deep Tissue Massage',
    dateTime: 'March 15, 2026 at 2:00 PM',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let prisma: ReturnType<typeof makePrisma>;
  let config: ReturnType<typeof makeConfig>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    config = makeConfig();
    queue = makeQueue();
    service = new CommunicationsService(
      prisma as never,
      config as never,
      queue as never,
    );
  });

  // -----------------------------------------------------------------------
  // createAndSend
  // -----------------------------------------------------------------------

  describe('createAndSend', () => {
    const defaultParams = {
      tenantId: TENANT_ID,
      recipientId: RECIPIENT_ID,
      recipientEmail: 'alice@example.com',
      recipientName: 'Alice Johnson',
      channel: 'EMAIL' as const,
      templateKey: 'booking-confirmation',
      templateData: baseTemplateData(),
    };

    beforeEach(() => {
      prisma.communication.create.mockResolvedValue({ id: COMM_ID });
      queue.add.mockResolvedValue(undefined);
    });

    it('should create a Communication record with status QUEUED and correct fields', async () => {
      await service.createAndSend(defaultParams);

      expect(prisma.communication.create).toHaveBeenCalledTimes(1);

      const callArg = prisma.communication.create.mock.calls[0]![0];
      const data = callArg.data;

      expect(data.tenantId).toBe(TENANT_ID);
      expect(data.recipientId).toBe(RECIPIENT_ID);
      expect(data.channel).toBe('EMAIL');
      expect(data.templateKey).toBe('booking-confirmation');
      expect(data.status).toBe('QUEUED');
      expect(data.subject).toEqual(expect.any(String));
      expect(data.subject.length).toBeGreaterThan(0);
      expect(data.body).toEqual(expect.any(String));
      expect(data.body.length).toBeGreaterThan(0);
    });

    it('should enqueue a JOB_DELIVER_COMMUNICATION job with the communicationId', async () => {
      await service.createAndSend(defaultParams);

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
        'deliverCommunication',
        expect.objectContaining({
          communicationId: COMM_ID,
          tenantId: TENANT_ID,
        }),
        expect.any(Object),
      );
    });

    it('should pass delay option through to BullMQ job', async () => {
      await service.createAndSend(defaultParams, { delayMs: 60_000 });

      const jobOpts = queue.add.mock.calls[0]![2];
      expect(jobOpts.delay).toBe(60_000);
    });

    it('should not include delay when delayMs is not provided', async () => {
      await service.createAndSend(defaultParams);

      const jobOpts = queue.add.mock.calls[0]![2];
      expect(jobOpts.delay).toBeUndefined();
    });

    it('should return the communication ID', async () => {
      const result = await service.createAndSend(defaultParams);
      expect(result).toBe(COMM_ID);
    });

    it('should configure retry: attempts=3, exponential backoff', async () => {
      await service.createAndSend(defaultParams);

      const jobOpts = queue.add.mock.calls[0]![2];
      expect(jobOpts.attempts).toBe(3);
      expect(jobOpts.backoff).toEqual({
        type: 'exponential',
        delay: 10_000,
      });
    });

    it('should store bookingId when provided', async () => {
      await service.createAndSend({
        ...defaultParams,
        bookingId: 'booking-123',
      });

      const data = prisma.communication.create.mock.calls[0]![0].data;
      expect(data.bookingId).toBe('booking-123');
    });

    it('should store bookingId as null when not provided', async () => {
      await service.createAndSend(defaultParams);

      const data = prisma.communication.create.mock.calls[0]![0].data;
      expect(data.bookingId).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // renderTemplate
  // -----------------------------------------------------------------------

  describe('renderTemplate', () => {
    // -- booking-confirmation --

    describe('booking-confirmation', () => {
      it('should return subject containing the business name', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData(),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/confirmed/i);
      });

      it('should include client name and service in HTML body', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData(),
        );
        expect(result.html).toContain('Alice Johnson');
        expect(result.html).toContain('Deep Tissue Massage');
      });

      it('should include provider name when provided', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData({ providerName: 'Dr. Smith' }),
        );
        expect(result.html).toContain('Dr. Smith');
      });
    });

    // -- booking-cancellation --

    describe('booking-cancellation', () => {
      it('should return subject containing business name', () => {
        const result = service.renderTemplate(
          'booking-cancellation',
          baseTemplateData({ cancellationReason: 'Schedule conflict' }),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/cancelled/i);
      });

      it('should include the cancellation reason in HTML', () => {
        const result = service.renderTemplate(
          'booking-cancellation',
          baseTemplateData({ cancellationReason: 'Schedule conflict' }),
        );
        expect(result.html).toContain('Schedule conflict');
      });

      it('should include refund amount when provided', () => {
        const result = service.renderTemplate(
          'booking-cancellation',
          baseTemplateData({
            cancellationReason: 'Provider unavailable',
            refundAmount: '25.00',
            currency: '$',
          }),
        );
        expect(result.html).toContain('25.00');
      });
    });

    // -- payment-receipt --

    describe('payment-receipt', () => {
      it('should return subject with business name', () => {
        const result = service.renderTemplate(
          'payment-receipt',
          baseTemplateData({ amount: '50.00', currency: '$' }),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/receipt/i);
      });

      it('should include payment amount in HTML', () => {
        const result = service.renderTemplate(
          'payment-receipt',
          baseTemplateData({ amount: '50.00', currency: '$' }),
        );
        expect(result.html).toContain('50.00');
      });
    });

    // -- booking-reminder --

    describe('booking-reminder', () => {
      it('should return subject about upcoming appointment', () => {
        const result = service.renderTemplate(
          'booking-reminder',
          baseTemplateData(),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/reminder/i);
      });

      it('should include date/time in HTML body', () => {
        const result = service.renderTemplate(
          'booking-reminder',
          baseTemplateData(),
        );
        expect(result.html).toContain('March 15, 2026 at 2:00 PM');
      });
    });

    // -- follow-up --

    describe('follow-up', () => {
      it('should return subject asking about appointment experience', () => {
        const result = service.renderTemplate(
          'follow-up',
          baseTemplateData({ tenantSlug: 'glow-studio', serviceId: 'svc-001' }),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/how was/i);
      });

      it('should include a rebook link', () => {
        const result = service.renderTemplate(
          'follow-up',
          baseTemplateData({
            tenantSlug: 'glow-studio',
            serviceId: 'svc-001',
            providerId: 'prov-001',
          }),
        );
        expect(result.html).toContain('Book Again');
        expect(result.html).toContain('glow-studio');
        expect(result.html).toContain('svc-001');
        expect(result.html).toContain('prov-001');
      });
    });

    // -- morning-summary --

    describe('morning-summary', () => {
      it('should return subject with date', () => {
        const result = service.renderTemplate(
          'morning-summary',
          baseTemplateData({ date: 'March 15, 2026' }),
        );
        expect(result.subject).toContain('March 15, 2026');
      });

      it('should render booking rows when bookings exist', () => {
        const result = service.renderTemplate('morning-summary', baseTemplateData({
          date: 'March 15, 2026',
          bookings: [
            { time: '09:00', clientName: 'Alice', serviceName: 'Massage', status: 'CONFIRMED' },
            { time: '10:00', clientName: 'Bob', serviceName: 'Facial', status: 'PENDING' },
          ],
        }));
        expect(result.html).toContain('Alice');
        expect(result.html).toContain('Bob');
        expect(result.html).toContain('Massage');
        expect(result.html).toContain('Facial');
        expect(result.html).toContain('2 bookings');
      });

      it('should render "No bookings today" when list is empty', () => {
        const result = service.renderTemplate('morning-summary', baseTemplateData({
          date: 'March 15, 2026',
          bookings: [],
        }));
        expect(result.html).toContain('No bookings today');
      });
    });

    // -- weekly-digest --

    describe('weekly-digest', () => {
      it('should return subject with business name', () => {
        const result = service.renderTemplate(
          'weekly-digest',
          baseTemplateData({
            weekRange: 'Mar 9 - Mar 15, 2026',
            totalBookings: 42,
            completedBookings: 38,
            cancelledBookings: 3,
            noShowBookings: 1,
            currency: '$',
            totalRevenue: '2,150.00',
            newClients: 7,
          }),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/weekly/i);
      });

      it('should include digest stats in HTML', () => {
        const result = service.renderTemplate(
          'weekly-digest',
          baseTemplateData({
            weekRange: 'Mar 9 - Mar 15, 2026',
            totalBookings: 42,
            completedBookings: 38,
            cancelledBookings: 3,
            noShowBookings: 1,
            currency: '$',
            totalRevenue: '2,150.00',
            newClients: 7,
          }),
        );
        expect(result.html).toContain('42');
        expect(result.html).toContain('38');
        expect(result.html).toContain('2,150.00');
        expect(result.html).toContain('Mar 9 - Mar 15, 2026');
      });
    });

    // -- payment-reminder --

    describe('payment-reminder', () => {
      it('should return subject with business name', () => {
        const result = service.renderTemplate(
          'payment-reminder',
          baseTemplateData({
            amountDue: '75.00',
            currency: '$',
            dueDate: 'March 20, 2026',
          }),
        );
        expect(result.subject).toContain('Glow Studio');
        expect(result.subject).toMatch(/payment reminder/i);
      });

      it('should include amount and due date in HTML', () => {
        const result = service.renderTemplate(
          'payment-reminder',
          baseTemplateData({
            amountDue: '75.00',
            currency: '$',
            dueDate: 'March 20, 2026',
          }),
        );
        expect(result.html).toContain('75.00');
        expect(result.html).toContain('March 20, 2026');
      });
    });

    // -- Unknown template key (default fallback) --

    describe('unknown template key', () => {
      it('should return default/fallback subject and HTML', () => {
        const result = service.renderTemplate(
          'some-unknown-template',
          { message: 'Custom notification text' },
        );
        expect(result.subject).toBe('Notification from SavSpot');
        expect(result.html).toContain('Custom notification text');
      });

      it('should use default message when no message provided', () => {
        const result = service.renderTemplate('unknown-key', {});
        expect(result.html).toContain('You have a new notification.');
      });

      it('should use custom businessName in fallback when provided', () => {
        const result = service.renderTemplate(
          'unknown-key',
          { businessName: 'My Salon', message: 'Hello' },
        );
        expect(result.html).toContain('My Salon');
      });
    });

    // -- Branding wrapper --

    describe('branding wrapper', () => {
      it('should include business name in all known templates', () => {
        const templates = [
          'booking-confirmation',
          'booking-cancellation',
          'payment-receipt',
          'booking-reminder',
          'follow-up',
          'payment-reminder',
          'morning-summary',
          'weekly-digest',
        ];

        for (const key of templates) {
          const result = service.renderTemplate(key, baseTemplateData({
            cancellationReason: 'test',
            amount: '10',
            currency: '$',
            amountDue: '10',
            dueDate: '2026-03-15',
            date: '2026-03-15',
            weekRange: 'Mar 9-15',
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            noShowBookings: 0,
            totalRevenue: '0',
            newClients: 0,
            tenantSlug: 'test',
            serviceId: 'svc-1',
          }));
          expect(result.html).toContain(
            'Glow Studio',
          );
        }
      });

      it('should include logo image when logoUrl is provided', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData({ logoUrl: 'https://example.com/logo.png' }),
        );
        expect(result.html).toContain('https://example.com/logo.png');
        expect(result.html).toContain('<img');
      });

      it('should apply brand color when provided', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData({ brandColor: '#FF5733' }),
        );
        expect(result.html).toContain('#FF5733');
      });

      it('should wrap in a full HTML document', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData(),
        );
        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('<html');
        expect(result.html).toContain('</html>');
      });

      it('should include SavSpot footer link', () => {
        const result = service.renderTemplate(
          'booking-confirmation',
          baseTemplateData(),
        );
        expect(result.html).toContain('savspot.co');
      });
    });
  });

  // -----------------------------------------------------------------------
  // HTML escaping
  // -----------------------------------------------------------------------

  describe('HTML escaping', () => {
    it('should escape < and > characters in template data', () => {
      const result = service.renderTemplate(
        'booking-confirmation',
        baseTemplateData({ clientName: '<script>alert("xss")</script>' }),
      );
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('should escape & character in template data', () => {
      const result = service.renderTemplate(
        'booking-confirmation',
        baseTemplateData({ serviceName: 'Cut & Color' }),
      );
      expect(result.html).toContain('Cut &amp; Color');
    });

    it('should escape double quote character in template data', () => {
      const result = service.renderTemplate(
        'booking-confirmation',
        baseTemplateData({ clientName: 'Alice "AJ" Johnson' }),
      );
      expect(result.html).toContain('Alice &quot;AJ&quot; Johnson');
    });

    it('should escape single quote character in template data', () => {
      const result = service.renderTemplate(
        'booking-confirmation',
        baseTemplateData({ serviceName: "Women's Haircut" }),
      );
      expect(result.html).toContain('Women&#039;s Haircut');
    });

    it('should handle all special characters together', () => {
      const result = service.renderTemplate(
        'booking-cancellation',
        baseTemplateData({
          cancellationReason: 'Client said: "I can\'t make it" & requested <refund>',
        }),
      );
      expect(result.html).not.toContain('<refund>');
      expect(result.html).toContain('&lt;refund&gt;');
      expect(result.html).toContain('&amp;');
      expect(result.html).toContain('&quot;');
      expect(result.html).toContain('&#039;');
    });

    it('should handle null/undefined values gracefully', () => {
      const result = service.renderTemplate(
        'booking-confirmation',
        baseTemplateData({ clientName: null, serviceName: undefined }),
      );
      // Should not throw, should render empty strings for null/undefined
      expect(result.html).toBeDefined();
      expect(result.subject).toBeDefined();
    });
  });
});
