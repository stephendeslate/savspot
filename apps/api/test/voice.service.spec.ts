import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { VoiceService } from '@/voice/services/voice.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CALL_SID = 'CA-test-call-sid-001';
const CALLER_NUMBER = '+15551234567';
const CALLED_NUMBER = '+15559876543';

function makePrisma() {
  const txProxy = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    voiceCallLog: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    voiceCallLog: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof txProxy) => Promise<unknown>) => {
      return fn(txProxy);
    }),
    _tx: txProxy,
  };
}

function makeRedis() {
  return {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  };
}

function makeVoiceAi() {
  return {
    processUtterance: vi.fn(),
  };
}

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Test Salon',
    voiceEnabled: true,
    voiceConfig: {
      mode: 'ai_only',
      greeting: 'Hello, welcome!',
      transferNumber: '+15550001111',
      transferTimeoutSeconds: 20,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VoiceService', () => {
  let service: VoiceService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let voiceAi: ReturnType<typeof makeVoiceAi>;

  beforeEach(() => {
    prisma = makePrisma();
    redis = makeRedis();
    voiceAi = makeVoiceAi();
    service = new VoiceService(prisma as never, redis as never, voiceAi as never);
  });

  // -----------------------------------------------------------------------
  // handleIncomingCall
  // -----------------------------------------------------------------------

  describe('handleIncomingCall', () => {
    it('should throw BadRequestException when FEATURE_VOICE is not enabled', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'false';

      await expect(
        service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER),
      ).rejects.toThrow(BadRequestException);

      process.env['FEATURE_VOICE'] = original;
    });

    it('should throw NotFoundException when no tenant matches the called number', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'true';
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER),
      ).rejects.toThrow(NotFoundException);

      process.env['FEATURE_VOICE'] = original;
    });

    it('should throw BadRequestException when voice is not enabled for tenant', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'true';
      prisma.tenant.findFirst.mockResolvedValue(makeTenant({ voiceEnabled: false }));

      await expect(
        service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER),
      ).rejects.toThrow(BadRequestException);

      process.env['FEATURE_VOICE'] = original;
    });

    it('should return tenant info with ai mode for ai_only config', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'true';
      prisma.tenant.findFirst.mockResolvedValue(makeTenant());

      const result = await service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER);

      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.tenantName).toBe('Test Salon');
      expect(result.voiceEnabled).toBe(true);
      expect(result.mode).toBe('ai');
      expect(result.greeting).toBe('Hello, welcome!');
      expect(result.transferNumber).toBe('+15550001111');
      expect(result.transferTimeoutSeconds).toBe(20);

      process.env['FEATURE_VOICE'] = original;
    });

    it('should return transfer mode when mode is transfer_only', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'true';
      prisma.tenant.findFirst.mockResolvedValue(
        makeTenant({ voiceConfig: { mode: 'transfer_only' } }),
      );

      const result = await service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER);

      expect(result.mode).toBe('transfer');

      process.env['FEATURE_VOICE'] = original;
    });

    it('should use default greeting when voiceConfig is null', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'true';
      prisma.tenant.findFirst.mockResolvedValue(
        makeTenant({ voiceConfig: null }),
      );

      const result = await service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER);

      expect(result.greeting).toContain('Test Salon');
      expect(result.transferNumber).toBeNull();
      expect(result.transferTimeoutSeconds).toBe(30);

      process.env['FEATURE_VOICE'] = original;
    });

    it('should default to ai mode when mode is unrecognized', async () => {
      const original = process.env['FEATURE_VOICE'];
      process.env['FEATURE_VOICE'] = 'true';
      prisma.tenant.findFirst.mockResolvedValue(
        makeTenant({ voiceConfig: { mode: 'unknown_mode' } }),
      );

      const result = await service.handleIncomingCall(CALLED_NUMBER, CALLER_NUMBER);

      expect(result.mode).toBe('ai');

      process.env['FEATURE_VOICE'] = original;
    });
  });

  // -----------------------------------------------------------------------
  // processGatherInput
  // -----------------------------------------------------------------------

  describe('processGatherInput', () => {
    it('should return fallback response when no conversation state found', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.processGatherInput(CALL_SID, 'hello', 0.9);

      expect(result.intent).toBe('UNKNOWN');
      expect(result.shouldTransfer).toBe(false);
      expect(result.responseText).toContain('lost track');
    });

    it('should process speech input through voice AI and update conversation state', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [],
        startedAt: new Date().toISOString(),
      };
      redis.get.mockResolvedValue(JSON.stringify(state));
      voiceAi.processUtterance.mockResolvedValue({
        responseText: 'I can help with that.',
        intent: 'BOOK_APPOINTMENT',
      });
      prisma._tx.tenant.findUnique.mockResolvedValue(null);
      // The method uses prisma.tenant.findUnique (not transaction)
      prisma.tenant.findUnique.mockResolvedValue(
        makeTenant(),
      );

      const result = await service.processGatherInput(CALL_SID, 'I want to book', 0.95);

      expect(voiceAi.processUtterance).toHaveBeenCalledWith(
        TENANT_ID,
        CALL_SID,
        'I want to book',
        expect.arrayContaining([{ role: 'user', text: 'I want to book' }]),
      );
      expect(result.responseText).toBe('I can help with that.');
      expect(result.intent).toBe('BOOK_APPOINTMENT');
      expect(result.shouldTransfer).toBe(false);
      // Verify conversation state was saved
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should set shouldTransfer to true when intent is TRANSFER_REQUEST', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [],
        startedAt: new Date().toISOString(),
      };
      redis.get.mockResolvedValue(JSON.stringify(state));
      voiceAi.processUtterance.mockResolvedValue({
        responseText: 'Transferring you now.',
        intent: 'TRANSFER_REQUEST',
      });
      prisma.tenant.findUnique.mockResolvedValue(
        makeTenant(),
      );

      const result = await service.processGatherInput(CALL_SID, 'transfer me', undefined);

      expect(result.shouldTransfer).toBe(true);
      expect(result.transferNumber).toBe('+15550001111');
    });

    it('should use default transfer config when tenant voiceConfig is null', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [],
        startedAt: new Date().toISOString(),
      };
      redis.get.mockResolvedValue(JSON.stringify(state));
      voiceAi.processUtterance.mockResolvedValue({
        responseText: 'Sure.',
        intent: 'GENERAL',
      });
      prisma.tenant.findUnique.mockResolvedValue({ voiceConfig: null });

      const result = await service.processGatherInput(CALL_SID, 'hello', 0.8);

      expect(result.transferNumber).toBeNull();
      expect(result.transferTimeoutSeconds).toBe(30);
    });
  });

  // -----------------------------------------------------------------------
  // handleCallStatus
  // -----------------------------------------------------------------------

  describe('handleCallStatus', () => {
    it('should return early when no conversation state exists', async () => {
      redis.get.mockResolvedValue(null);

      await service.handleCallStatus(CALL_SID, 'completed', 120);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should upsert call log and delete redis state on completed call', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [{ role: 'user', text: 'hi' }],
        startedAt: '2026-03-01T12:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(state));

      await service.handleCallStatus(CALL_SID, 'completed', 60);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma._tx.voiceCallLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { callSid: CALL_SID },
          create: expect.objectContaining({
            tenantId: TENANT_ID,
            callSid: CALL_SID,
            callerNumber: CALLER_NUMBER,
            direction: 'INBOUND',
            status: 'COMPLETED',
            duration: 60,
            aiHandled: true,
          }),
        }),
      );
      expect(redis.del).toHaveBeenCalledWith(`voice:conversation:${CALL_SID}`);
    });

    it('should map busy status correctly', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [],
        startedAt: '2026-03-01T12:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(state));

      await service.handleCallStatus(CALL_SID, 'busy', undefined);

      expect(prisma._tx.voiceCallLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: 'BUSY',
            duration: null,
            aiHandled: false,
          }),
        }),
      );
    });

    it('should map canceled status to FAILED', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [],
        startedAt: '2026-03-01T12:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(state));

      await service.handleCallStatus(CALL_SID, 'canceled', undefined);

      expect(prisma._tx.voiceCallLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('should default unknown status to COMPLETED', async () => {
      const state = {
        tenantId: TENANT_ID,
        callerNumber: CALLER_NUMBER,
        history: [],
        startedAt: '2026-03-01T12:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(state));

      await service.handleCallStatus(CALL_SID, 'some-unknown-status', 10);

      expect(prisma._tx.voiceCallLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // getCallLogs
  // -----------------------------------------------------------------------

  describe('getCallLogs', () => {
    it('should return paginated call logs with metadata', async () => {
      const mockLogs = [
        { id: 'log-1', callSid: 'CS1', status: 'COMPLETED', createdAt: new Date() },
      ];
      prisma._tx.voiceCallLog.findMany.mockResolvedValue(mockLogs);
      prisma._tx.voiceCallLog.count.mockResolvedValue(25);

      const result = await service.getCallLogs(TENANT_ID, { page: 2, limit: 10 });

      expect(result.data).toEqual(mockLogs);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should use default pagination when not specified', async () => {
      prisma._tx.voiceCallLog.findMany.mockResolvedValue([]);
      prisma._tx.voiceCallLog.count.mockResolvedValue(0);

      const result = await service.getCallLogs(TENANT_ID, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getCallTranscript
  // -----------------------------------------------------------------------

  describe('getCallTranscript', () => {
    it('should return call log with transcript', async () => {
      const mockLog = {
        id: 'log-1',
        callSid: CALL_SID,
        callerNumber: CALLER_NUMBER,
        transcript: [{ role: 'user', text: 'hello' }],
        toolCalls: null,
        aiConfidenceScores: null,
        createdAt: new Date(),
      };
      prisma.voiceCallLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.getCallTranscript('log-1');

      expect(result).toEqual(mockLog);
    });

    it('should throw NotFoundException when call log does not exist', async () => {
      prisma.voiceCallLog.findUnique.mockResolvedValue(null);

      await expect(service.getCallTranscript('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // getVoiceConfig
  // -----------------------------------------------------------------------

  describe('getVoiceConfig', () => {
    it('should return voice configuration for tenant', async () => {
      prisma._tx.tenant.findUnique.mockResolvedValue({
        voiceEnabled: true,
        voicePhoneNumber: CALLED_NUMBER,
        voiceConfig: { mode: 'ai_only' },
      });

      const result = await service.getVoiceConfig(TENANT_ID);

      expect(result).toEqual({
        voiceEnabled: true,
        voicePhoneNumber: CALLED_NUMBER,
        voiceConfig: { mode: 'ai_only' },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma._tx.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getVoiceConfig('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateVoiceConfig
  // -----------------------------------------------------------------------

  describe('updateVoiceConfig', () => {
    it('should merge updates into existing voiceConfig', async () => {
      prisma._tx.tenant.findUnique.mockResolvedValue({
        voiceConfig: { mode: 'ai_only', greeting: 'Old greeting' },
        voiceEnabled: true,
      });
      prisma._tx.tenant.update = vi.fn().mockResolvedValue({
        voiceEnabled: true,
        voicePhoneNumber: CALLED_NUMBER,
        voiceConfig: { mode: 'ai_only', greeting: 'New greeting' },
      });
      // Override $transaction to use tx with update
      prisma.$transaction.mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          ...prisma._tx,
          tenant: { ...prisma._tx.tenant, update: prisma._tx.tenant.update ?? vi.fn() },
        } as never);
      }) as never);
      prisma._tx.tenant.update = vi.fn().mockResolvedValue({
        voiceEnabled: true,
        voicePhoneNumber: CALLED_NUMBER,
        voiceConfig: { mode: 'ai_only', greeting: 'New greeting' },
      });

      const result = await service.updateVoiceConfig(TENANT_ID, {
        greeting: 'New greeting',
      });

      expect(result.voiceConfig).toEqual({ mode: 'ai_only', greeting: 'New greeting' });
    });

    it('should throw NotFoundException when tenant not found during update', async () => {
      prisma._tx.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateVoiceConfig('missing', { greeting: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update voiceEnabled separately from voiceConfig', async () => {
      prisma._tx.tenant.findUnique.mockResolvedValue({
        voiceConfig: { mode: 'ai_only' },
        voiceEnabled: false,
      });
      prisma._tx.tenant.update = vi.fn().mockResolvedValue({
        voiceEnabled: true,
        voicePhoneNumber: CALLED_NUMBER,
        voiceConfig: { mode: 'ai_only' },
      });

      const result = await service.updateVoiceConfig(TENANT_ID, {
        voiceEnabled: true,
      });

      expect(result.voiceEnabled).toBe(true);
      expect(prisma._tx.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ voiceEnabled: true }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // initConversationState
  // -----------------------------------------------------------------------

  describe('initConversationState', () => {
    it('should save initial state to redis with TTL', async () => {
      await service.initConversationState(CALL_SID, TENANT_ID, CALLER_NUMBER);

      expect(redis.setex).toHaveBeenCalledWith(
        `voice:conversation:${CALL_SID}`,
        1800,
        expect.stringContaining(TENANT_ID),
      );

      const savedState = JSON.parse(redis.setex.mock.calls[0]![2] as string);
      expect(savedState.tenantId).toBe(TENANT_ID);
      expect(savedState.callerNumber).toBe(CALLER_NUMBER);
      expect(savedState.history).toEqual([]);
      expect(savedState.startedAt).toBeDefined();
    });
  });
});
