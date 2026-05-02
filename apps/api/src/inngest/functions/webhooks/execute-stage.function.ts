import type { StageExecutionHandler } from '@/workflows/processors/stage-execution.handler';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: runs a delayed workflow stage
 * (e.g. "send email 24h after booking"). Triggered by
 * `webhooks/executeStage` events.
 *
 * Phase 4l port — replaces the JOB_EXECUTE_STAGE branch in
 * `apps/api/src/workflows/webhooks.dispatcher.ts`.
 */
export const createExecuteStageFunction = (
  handler: StageExecutionHandler,
) =>
  inngest.createFunction(
    {
      id: 'webhooks-execute-stage',
      name: 'Execute delayed workflow stage',
    },
    { event: 'webhooks/executeStage' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, stageId: event.data.stageId };
    },
  );
