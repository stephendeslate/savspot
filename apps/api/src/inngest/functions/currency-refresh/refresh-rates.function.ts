import type { CurrencyService } from '@/currency/currency.service';
import { inngest } from '../../inngest.client';

/**
 * Hourly Inngest cron: pulls fresh FX rates from Open Exchange Rates into the
 * Redis cache (`currency:rates`). Matches the CurrencyService 1-hour cache
 * TTL so the cache stays warm. The service silently swallows fetch errors
 * and falls back to seed rates, so a missed run never breaks reads.
 *
 * Phase 4d port — replaces `apps/api/src/currency/currency-refresh.processor.ts`
 * (BullMQ). The BullMQ schedule was never registered in JobSchedulerService,
 * so this Inngest cron is the first time the job actually fires on a schedule
 * in production. Take-over only — no parallel-execution risk.
 */
export const createRefreshRatesFunction = (currencyService: CurrencyService) =>
  inngest.createFunction(
    { id: 'currency-refresh-refresh-rates', name: 'Refresh exchange rates' },
    { cron: '0 * * * *' },
    async () => {
      await currencyService.refreshRates();
      return { ok: true };
    },
  );
