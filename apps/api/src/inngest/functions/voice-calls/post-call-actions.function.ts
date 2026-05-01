import type { VoiceCallEventsService } from '@/voice/services/voice-call-events.service';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: post-call workflow for voice calls
 * that resulted in a booking. Sends the booking confirmation email,
 * notifies tenant staff (OWNER/ADMIN) about the voice-originated booking.
 *
 * Triggered by `voice-calls/postCallActions` events from the dispatcher.
 *
 * Phase 4j port — replaces the JOB_POST_CALL_ACTIONS branch in
 * `apps/api/src/voice/processors/voice-call.processor.ts`. Logic
 * extracted to VoiceCallEventsService so this function is a thin wrapper.
 */
export const createPostCallActionsFunction = (
  events: VoiceCallEventsService,
) =>
  inngest.createFunction(
    {
      id: 'voice-calls-post-call-actions',
      name: 'Run voice call post-call actions',
    },
    { event: 'voice-calls/postCallActions' },
    async ({ event }) => {
      await events.processPostCallActions(event.data);
      return { ok: true, callLogId: event.data.callLogId };
    },
  );
