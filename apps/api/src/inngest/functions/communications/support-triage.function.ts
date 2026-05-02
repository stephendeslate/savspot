import type {
  SupportTriageHandler,
  TriagePayload,
} from '@/jobs/support-triage.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: AI-powered support ticket triage
 * via local Ollama (Qwen3). Classifies a NEW ticket as AUTO_RESOLVE
 * (high confidence) or NEEDS_REVIEW; updates the SupportTicket row
 * with the diagnosis + resolution.
 *
 * Triggered by `communications/supportTriage` events from
 * `SupportService.createTicket()` and `reopenTicket()`.
 *
 * Phase 4r port — replaces the JOB_SUPPORT_TRIAGE branch in
 * `apps/api/src/communications/communications.dispatcher.ts`.
 */
export const createSupportTriageFunction = (handler: SupportTriageHandler) =>
  inngest.createFunction(
    {
      id: 'communications-support-triage',
      name: 'AI support ticket triage',
    },
    { event: 'communications/supportTriage' },
    async ({ event }) => {
      await handler.handle(event.data as TriagePayload);
      return { ok: true, ticketId: event.data.ticketId };
    },
  );
