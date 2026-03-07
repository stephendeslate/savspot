import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupportTriageHandler } from '@/jobs/support-triage.processor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TICKET_ID = 'ticket-001';

function makePrisma() {
  return {
    supportTicket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeConfigService() {
  return {
    get: vi.fn((key: string, defaultVal: string) => defaultVal),
  };
}

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    category: 'QUESTION',
    severity: 'LOW',
    subject: 'How do I reschedule?',
    body: 'I need to move my appointment to next week.',
    status: 'NEW',
    submitter: { name: 'Jane', email: 'jane@test.com' },
    tenant: { name: 'Test Salon', category: 'BEAUTY' },
    ...overrides,
  };
}

function makeJob(data = { ticketId: TICKET_ID }) {
  return { data } as never;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SupportTriageHandler', () => {
  let handler: SupportTriageHandler;
  let prisma: ReturnType<typeof makePrisma>;
  let configService: ReturnType<typeof makeConfigService>;

  beforeEach(() => {
    prisma = makePrisma();
    configService = makeConfigService();
    handler = new SupportTriageHandler(prisma as never, configService as never);
  });

  it('should skip if ticket not found', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(null);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it('should skip if ticket status is not NEW', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(
      makeTicket({ status: 'ESCALATED' }),
    );

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it('should auto-resolve ticket when AI returns high confidence AUTO_RESOLVE', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(makeTicket());
    prisma.supportTicket.update.mockResolvedValue({});

    const aiResponse = JSON.stringify({
      classification: 'AUTO_RESOLVE',
      confidence: 0.95,
      diagnosis: 'Common rescheduling question',
      suggestedResponse: 'You can reschedule from your bookings page.',
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: aiResponse, done: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'AI_RESOLVED',
        aiDiagnosis: 'Common rescheduling question',
        aiResponse: 'You can reschedule from your bookings page.',
        aiResolutionType: 'AUTO_RESOLVED',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should escalate ticket when AI returns low confidence', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(makeTicket());
    prisma.supportTicket.update.mockResolvedValue({});

    const aiResponse = JSON.stringify({
      classification: 'AUTO_RESOLVE',
      confidence: 0.6,
      diagnosis: 'Might be a rescheduling question',
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: aiResponse, done: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'ESCALATED',
        aiResolutionType: 'ESCALATED',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should escalate when AI returns NEEDS_REVIEW', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(makeTicket());
    prisma.supportTicket.update.mockResolvedValue({});

    const aiResponse = JSON.stringify({
      classification: 'NEEDS_REVIEW',
      confidence: 0.9,
      diagnosis: 'Billing dispute needs human review',
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: aiResponse, done: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'ESCALATED',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should escalate when Ollama request fails', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(makeTicket());
    prisma.supportTicket.update.mockResolvedValue({});

    const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    vi.stubGlobal('fetch', mockFetch);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'ESCALATED',
        aiResolutionType: 'ESCALATED',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should escalate when AI returns unparseable response', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(makeTicket());
    prisma.supportTicket.update.mockResolvedValue({});

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ response: 'This is not JSON at all', done: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'ESCALATED',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should handle AI response wrapped in markdown code block', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(makeTicket());
    prisma.supportTicket.update.mockResolvedValue({});

    const wrappedResponse = '```json\n' + JSON.stringify({
      classification: 'AUTO_RESOLVE',
      confidence: 0.92,
      diagnosis: 'FAQ question',
      suggestedResponse: 'Check the FAQ page.',
    }) + '\n```';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: wrappedResponse, done: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await handler.handle(makeJob());

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'AI_RESOLVED',
        aiDiagnosis: 'FAQ question',
      }),
    });

    vi.unstubAllGlobals();
  });
});
