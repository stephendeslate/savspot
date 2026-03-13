import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngineService } from '../src/workflows/workflow-engine.service';
import { BookingEventPayload } from '../src/events/event.types';

function makePrisma() {
  return {
    booking: { findUnique: vi.fn() },
    tenantMembership: { findMany: vi.fn() },
    tenant: { findUniqueOrThrow: vi.fn() },
    invoice: { findFirst: vi.fn() },
    workflowAutomation: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    communication: { create: vi.fn() },
    notificationType: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
  };
}

function makeComms() {
  return { createAndSend: vi.fn().mockResolvedValue(undefined) };
}

function makeTwilio() {
  return { sendSms: vi.fn().mockResolvedValue({ success: true, sid: 'SM1' }) };
}

const TENANT = {
  name: 'Test Salon',
  slug: 'test-salon',
  logoUrl: null,
  brandColor: '#ff0000',
  currency: 'USD',
};

function basePayload(overrides: Partial<BookingEventPayload> = {}): BookingEventPayload {
  return {
    tenantId: 'tenant-1',
    bookingId: 'booking-1',
    serviceId: 'service-1',
    clientId: 'client-1',
    clientEmail: 'client@test.com',
    clientName: 'Jane Doe',
    serviceName: 'Haircut',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    source: 'DIRECT',
    ...overrides,
  };
}

describe('WorkflowEngineService — handleBookingCreated (M4)', () => {
  let service: WorkflowEngineService;
  let prisma: ReturnType<typeof makePrisma>;
  let comms: ReturnType<typeof makeComms>;

  beforeEach(() => {
    prisma = makePrisma();
    comms = makeComms();
    const configService = { get: (key: string, defaultValue: string) => defaultValue } as never;
    const invoicesService = { createForBooking: vi.fn().mockResolvedValue({}) } as never;
    const browserPushService = { sendToUser: vi.fn().mockResolvedValue(1), sendToTenantAdmins: vi.fn().mockResolvedValue(1) } as never;
    const expoPushService = { sendToUser: vi.fn().mockResolvedValue(1) } as never;
    const stageOrchestratorService = { runWorkflow: vi.fn().mockResolvedValue(undefined) } as never;
    service = new WorkflowEngineService(prisma as never, comms as never, makeTwilio() as never, configService, invoicesService, browserPushService, expoPushService, stageOrchestratorService);
  });

  it('sends staff notification for PENDING booking (MANUAL_APPROVAL)', async () => {
    prisma.booking.findUnique.mockResolvedValue({ status: 'PENDING' });
    prisma.tenantMembership.findMany.mockResolvedValue([
      { userId: 'owner-1', role: 'OWNER', user: { email: 'owner@test.com', name: 'Sam' } },
    ]);
    prisma.tenant.findUniqueOrThrow.mockResolvedValue(TENANT);

    await service.handleBookingCreated(basePayload());

    expect(comms.createAndSend).toHaveBeenCalledTimes(1);
    expect(comms.createAndSend).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'staff-approval-required',
        recipientEmail: 'owner@test.com',
        recipientName: 'Sam',
        templateData: expect.objectContaining({
          clientName: 'Jane Doe',
          serviceName: 'Haircut',
          staffName: 'Sam',
        }),
      }),
    );
  });

  it('does NOT send notification for CONFIRMED booking (AUTO_CONFIRM)', async () => {
    prisma.booking.findUnique.mockResolvedValue({ status: 'CONFIRMED' });

    await service.handleBookingCreated(basePayload());

    expect(comms.createAndSend).not.toHaveBeenCalled();
    expect(prisma.tenantMembership.findMany).not.toHaveBeenCalled();
  });

  it('sends separate email to each OWNER/ADMIN member', async () => {
    prisma.booking.findUnique.mockResolvedValue({ status: 'PENDING' });
    prisma.tenantMembership.findMany.mockResolvedValue([
      { userId: 'owner-1', role: 'OWNER', user: { email: 'owner@test.com', name: 'Sam' } },
      { userId: 'admin-1', role: 'ADMIN', user: { email: 'admin@test.com', name: 'Alex' } },
    ]);
    prisma.tenant.findUniqueOrThrow.mockResolvedValue(TENANT);

    await service.handleBookingCreated(basePayload());

    expect(comms.createAndSend).toHaveBeenCalledTimes(2);
  });

  it('does not throw when tenant has no OWNER/ADMIN members', async () => {
    prisma.booking.findUnique.mockResolvedValue({ status: 'PENDING' });
    prisma.tenantMembership.findMany.mockResolvedValue([]);

    await expect(service.handleBookingCreated(basePayload())).resolves.not.toThrow();
    expect(comms.createAndSend).not.toHaveBeenCalled();
  });

  it('includes approve URL in template data', async () => {
    prisma.booking.findUnique.mockResolvedValue({ status: 'PENDING' });
    prisma.tenantMembership.findMany.mockResolvedValue([
      { userId: 'owner-1', role: 'OWNER', user: { email: 'owner@test.com', name: 'Sam' } },
    ]);
    prisma.tenant.findUniqueOrThrow.mockResolvedValue(TENANT);

    await service.handleBookingCreated(basePayload());

    const call = comms.createAndSend.mock.calls[0]![0] as Record<string, unknown>;
    const templateData = call['templateData'] as Record<string, unknown>;
    expect(templateData['approveUrl']).toContain('/bookings/booking-1');
  });
});
