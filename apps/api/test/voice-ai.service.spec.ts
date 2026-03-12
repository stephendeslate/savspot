import { describe, it, expect } from 'vitest';
import { VoiceAiService } from '@/voice/services/voice-ai.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CALL_ID = 'call-001';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VoiceAiService', () => {
  const service = new VoiceAiService();

  // -----------------------------------------------------------------------
  // processUtterance
  // -----------------------------------------------------------------------

  describe('processUtterance', () => {
    it('should detect BOOK_APPOINTMENT intent for "appointment" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I need to make an appointment',
        [],
      );

      expect(result.intent).toBe('BOOK_APPOINTMENT');
      expect(result.responseText).toContain('book an appointment');
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls![0]!.tool).toBe('check_availability');
    });

    it('should detect BOOK_APPOINTMENT intent for "book" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I want to book a haircut',
        [],
      );

      expect(result.intent).toBe('BOOK_APPOINTMENT');
    });

    it('should detect BOOK_APPOINTMENT intent for "schedule" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'Can I schedule something?',
        [],
      );

      expect(result.intent).toBe('BOOK_APPOINTMENT');
    });

    it('should detect CANCEL_BOOKING intent for "cancel" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I need to cancel please',
        [],
      );

      expect(result.intent).toBe('CANCEL_BOOKING');
      expect(result.responseText).toContain('phone number');
      expect(result.toolCalls).toBeUndefined();
    });

    it('should detect BOOK_APPOINTMENT for "reschedule" since it contains "schedule"', async () => {
      // "reschedule" contains "schedule" which matches BOOK_APPOINTMENT first
      // in the priority chain. This tests the actual priority behavior.
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I want to reschedule',
        [],
      );

      expect(result.intent).toBe('BOOK_APPOINTMENT');
    });

    it('should detect CANCEL_BOOKING intent for standalone "cancel" without booking keywords', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I need to cancel it',
        [],
      );

      expect(result.intent).toBe('CANCEL_BOOKING');
    });

    it('should detect AVAILABILITY_CHECK intent for "hours" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'What are your hours?',
        [],
      );

      expect(result.intent).toBe('AVAILABILITY_CHECK');
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls![0]!.tool).toBe('get_business_info');
    });

    it('should detect AVAILABILITY_CHECK intent for "open" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'Are you open on Saturday?',
        [],
      );

      expect(result.intent).toBe('AVAILABILITY_CHECK');
    });

    it('should detect TRANSFER_REQUEST intent for "transfer" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'Can you transfer me?',
        [],
      );

      expect(result.intent).toBe('TRANSFER_REQUEST');
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls![0]!.tool).toBe('transfer_to_human');
    });

    it('should detect TRANSFER_REQUEST intent for "speak to someone" phrase', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I want to speak to someone',
        [],
      );

      expect(result.intent).toBe('TRANSFER_REQUEST');
    });

    it('should detect TRANSFER_REQUEST intent for "human" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'Can I talk to a human?',
        [],
      );

      expect(result.intent).toBe('TRANSFER_REQUEST');
    });

    it('should detect TRANSFER_REQUEST intent for "representative" keyword', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I need a representative',
        [],
      );

      expect(result.intent).toBe('TRANSFER_REQUEST');
    });

    it('should return UNKNOWN intent for unrecognized utterances', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'What is the meaning of life?',
        [],
      );

      expect(result.intent).toBe('UNKNOWN');
      expect(result.responseText).toContain('booking appointments');
      expect(result.toolCalls).toBeUndefined();
    });

    it('should handle case-insensitive matching', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'BOOK AN APPOINTMENT PLEASE',
        [],
      );

      expect(result.intent).toBe('BOOK_APPOINTMENT');
    });

    it('should prioritize booking intent when multiple keywords match (appointment first)', async () => {
      const result = await service.processUtterance(
        TENANT_ID,
        CALL_ID,
        'I want to schedule an appointment and check hours',
        [],
      );

      // "appointment" and "schedule" match BOOK_APPOINTMENT first
      expect(result.intent).toBe('BOOK_APPOINTMENT');
    });
  });

  // -----------------------------------------------------------------------
  // buildSystemPrompt
  // -----------------------------------------------------------------------

  describe('buildSystemPrompt', () => {
    it('should include tenant ID in the prompt', () => {
      const prompt = service.buildSystemPrompt(TENANT_ID);

      expect(prompt).toContain(TENANT_ID);
    });

    it('should describe available tools', () => {
      const prompt = service.buildSystemPrompt(TENANT_ID);

      expect(prompt).toContain('check_availability');
      expect(prompt).toContain('create_booking');
      expect(prompt).toContain('cancel_booking');
      expect(prompt).toContain('get_business_info');
      expect(prompt).toContain('transfer_to_human');
    });

    it('should describe the AI role', () => {
      const prompt = service.buildSystemPrompt(TENANT_ID);

      expect(prompt).toContain('AI voice receptionist');
    });
  });
});
