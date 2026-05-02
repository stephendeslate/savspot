import type { EnforcePaymentDeadlinesHandler } from '@/jobs/enforce-payment-deadlines.processor';
import type { RetryFailedPaymentsHandler } from '@/jobs/retry-failed-payments.processor';
import type { SendPaymentRemindersHandler } from '@/jobs/send-payment-reminders.processor';
import { inngest } from '../../inngest.client';

/**
 * Phase 4s — payments queue Inngest cron functions. Replaces the
 * three actively-scheduled branches of `PaymentsDispatcher`. Each
 * handler is a parameterless service method already; the closure
 * factories just wire them up to Inngest crons matching the
 * JobSchedulerService schedules.
 *
 * The other three dispatcher branches (processWebhookRetries,
 * detectOrphanPayments, reconcilePayments) are documented as
 * scheduled but were never wired into JobSchedulerService.schedules
 * — they remain as latent dead code in the dispatcher and are not
 * ported here. Wiring them up is a separate behavioral change beyond
 * the scope of this BullMQ → Inngest port.
 */

export const createSendPaymentRemindersFunction = (
  handler: SendPaymentRemindersHandler,
) =>
  inngest.createFunction(
    {
      id: 'payments-send-payment-reminders',
      name: 'Send invoice payment reminders',
    },
    { cron: '*/15 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createEnforcePaymentDeadlinesFunction = (
  handler: EnforcePaymentDeadlinesHandler,
) =>
  inngest.createFunction(
    {
      id: 'payments-enforce-payment-deadlines',
      name: 'Enforce invoice payment deadlines',
    },
    { cron: '0 6 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createRetryFailedPaymentsFunction = (
  handler: RetryFailedPaymentsHandler,
) =>
  inngest.createFunction(
    {
      id: 'payments-retry-failed-payments',
      name: 'Retry failed payments',
    },
    { cron: '*/30 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
