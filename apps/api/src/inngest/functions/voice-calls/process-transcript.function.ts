import type { VoiceCallEventsService } from '@/voice/services/voice-call-events.service';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: stores a voice-call transcript
 * row on `voiceCallLog` after the live call ends. Per-tenant isolation
 * is enforced via `set_config('app.current_tenant', $1, TRUE)` inside
 * a transaction.
 *
 * Triggered by `voice-calls/processTranscript` events from the
 * dispatcher. Payload mirrors the BullMQ JOB_PROCESS_TRANSCRIPT job.
 *
 * Phase 4j port — replaces the JOB_PROCESS_TRANSCRIPT branch in
 * `apps/api/src/voice/processors/voice-call.processor.ts`. Logic
 * extracted to VoiceCallEventsService so this function is a thin wrapper.
 */
export const createProcessTranscriptFunction = (
  events: VoiceCallEventsService,
) =>
  inngest.createFunction(
    {
      id: 'voice-calls-process-transcript',
      name: 'Store voice call transcript',
    },
    { event: 'voice-calls/processTranscript' },
    async ({ event }) => {
      await events.processTranscript(event.data);
      return { ok: true, callLogId: event.data.callLogId };
    },
  );
