import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

const mockService = {
  listQuotes: vi.fn(),
  createQuote: vi.fn(),
  getQuote: vi.fn(),
  updateQuote: vi.fn(),
  addLineItem: vi.fn(),
  updateLineItem: vi.fn(),
  deleteLineItem: vi.fn(),
  reviseQuote: vi.fn(),
  sendQuote: vi.fn(),
  acceptQuote: vi.fn(),
  rejectQuote: vi.fn(),
};

describe('QuotesController', () => {
  let controller: QuotesController;
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const quoteId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new QuotesController(mockService as unknown as QuotesService);
  });

  it('should delegate listQuotes to service', async () => {
    const query = { page: 1, limit: 20 };
    mockService.listQuotes.mockResolvedValue({ data: [], meta: {} });

    await controller.listQuotes(tenantId, query);

    expect(mockService.listQuotes).toHaveBeenCalledWith(tenantId, query);
  });

  it('should delegate createQuote to service', async () => {
    const dto = { bookingId: 'bk-1' };
    mockService.createQuote.mockResolvedValue({ id: quoteId });

    await controller.createQuote(tenantId, dto);

    expect(mockService.createQuote).toHaveBeenCalledWith(tenantId, dto);
  });

  it('should delegate getQuote to service', async () => {
    mockService.getQuote.mockResolvedValue({ id: quoteId });

    await controller.getQuote(tenantId, quoteId);

    expect(mockService.getQuote).toHaveBeenCalledWith(tenantId, quoteId);
  });

  it('should delegate updateQuote to service', async () => {
    const dto = { notes: 'Updated' };
    mockService.updateQuote.mockResolvedValue({ id: quoteId });

    await controller.updateQuote(tenantId, quoteId, dto);

    expect(mockService.updateQuote).toHaveBeenCalledWith(tenantId, quoteId, dto);
  });

  it('should delegate addLineItem to service', async () => {
    const dto = { description: 'Item', quantity: 1, unitPrice: 100 };
    mockService.addLineItem.mockResolvedValue({ id: 'li-1' });

    await controller.addLineItem(tenantId, quoteId, dto);

    expect(mockService.addLineItem).toHaveBeenCalledWith(tenantId, quoteId, dto);
  });

  it('should delegate updateLineItem to service', async () => {
    const itemId = 'li-1';
    const dto = { quantity: 3 };
    mockService.updateLineItem.mockResolvedValue({ id: itemId });

    await controller.updateLineItem(tenantId, itemId, dto);

    expect(mockService.updateLineItem).toHaveBeenCalledWith(tenantId, itemId, dto);
  });

  it('should delegate deleteLineItem to service', async () => {
    const itemId = 'li-1';
    mockService.deleteLineItem.mockResolvedValue({ deleted: true });

    await controller.deleteLineItem(tenantId, itemId);

    expect(mockService.deleteLineItem).toHaveBeenCalledWith(tenantId, itemId);
  });

  it('should delegate reviseQuote to service', async () => {
    mockService.reviseQuote.mockResolvedValue({ id: 'new-id', version: 2 });

    await controller.reviseQuote(tenantId, quoteId);

    expect(mockService.reviseQuote).toHaveBeenCalledWith(tenantId, quoteId);
  });

  it('should delegate sendQuote to service', async () => {
    mockService.sendQuote.mockResolvedValue({ status: 'SENT' });

    await controller.sendQuote(tenantId, quoteId);

    expect(mockService.sendQuote).toHaveBeenCalledWith(tenantId, quoteId);
  });

  it('should delegate acceptQuote to service', async () => {
    const dto = { signatureData: 'data:...' };
    mockService.acceptQuote.mockResolvedValue({ status: 'ACCEPTED' });

    await controller.acceptQuote(tenantId, quoteId, dto);

    expect(mockService.acceptQuote).toHaveBeenCalledWith(tenantId, quoteId, dto);
  });

  it('should delegate rejectQuote to service', async () => {
    mockService.rejectQuote.mockResolvedValue({ status: 'REJECTED' });

    await controller.rejectQuote(tenantId, quoteId);

    expect(mockService.rejectQuote).toHaveBeenCalledWith(tenantId, quoteId);
  });
});
