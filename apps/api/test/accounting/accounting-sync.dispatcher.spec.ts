// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountingSyncDispatcher } from '@/accounting/accounting-sync.dispatcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHandler() {
  return { handle: vi.fn() };
}

function makeJob(name: string, data: Record<string, unknown> = {}) {
  return { name, data } as never;
}

describe('AccountingSyncDispatcher', () => {
  let dispatcher: AccountingSyncDispatcher;
  let invoicesHandler: ReturnType<typeof makeHandler>;
  let paymentsHandler: ReturnType<typeof makeHandler>;
  let clientsHandler: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    invoicesHandler = makeHandler();
    paymentsHandler = makeHandler();
    clientsHandler = makeHandler();
    dispatcher = new AccountingSyncDispatcher(
      invoicesHandler as never,
      paymentsHandler as never,
      clientsHandler as never,
    );
  });

  it('routes accountingSyncInvoices to invoices handler', async () => {
    const job = makeJob('accountingSyncInvoices', { connectionId: 'c1' });

    await dispatcher.process(job);

    expect(invoicesHandler.handle).toHaveBeenCalledWith(job);
    expect(paymentsHandler.handle).not.toHaveBeenCalled();
    expect(clientsHandler.handle).not.toHaveBeenCalled();
  });

  it('routes accountingSyncPayments to payments handler', async () => {
    const job = makeJob('accountingSyncPayments', { connectionId: 'c1' });

    await dispatcher.process(job);

    expect(paymentsHandler.handle).toHaveBeenCalledWith(job);
    expect(invoicesHandler.handle).not.toHaveBeenCalled();
  });

  it('routes accountingSyncClients to clients handler', async () => {
    const job = makeJob('accountingSyncClients', { connectionId: 'c1' });

    await dispatcher.process(job);

    expect(clientsHandler.handle).toHaveBeenCalledWith(job);
    expect(invoicesHandler.handle).not.toHaveBeenCalled();
  });

  it('does not throw for unknown job names', async () => {
    const job = makeJob('unknownJob');

    await expect(dispatcher.process(job)).resolves.toBeUndefined();

    expect(invoicesHandler.handle).not.toHaveBeenCalled();
    expect(paymentsHandler.handle).not.toHaveBeenCalled();
    expect(clientsHandler.handle).not.toHaveBeenCalled();
  });
});
