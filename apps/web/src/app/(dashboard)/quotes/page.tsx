'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { formatAmount, formatStatus } from '@/lib/format-utils';

// ---------- Types ----------

interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'VOIDED';
  total: string;
  currency: string;
  validUntil: string;
  lineItems: QuoteLineItem[];
  createdAt: string;
}

interface QuotesResponse {
  data: Quote[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface LineItemFormData {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface QuoteFormData {
  clientEmail: string;
  validUntil: string;
  lineItems: LineItemFormData[];
}

// ---------- Constants ----------

const PAGE_LIMIT = 20;

const EMPTY_LINE_ITEM: LineItemFormData = {
  description: '',
  quantity: '1',
  unitPrice: '',
};

const EMPTY_FORM: QuoteFormData = {
  clientEmail: '',
  validUntil: '',
  lineItems: [{ ...EMPTY_LINE_ITEM }],
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

// ---------- Helpers ----------

function getQuoteStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'SENT':
      return 'bg-blue-100 text-blue-800';
    case 'ACCEPTED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function calculateLineItemTotal(quantity: string, unitPrice: string): string {
  const q = parseFloat(quantity);
  const p = parseFloat(unitPrice);
  if (isNaN(q) || isNaN(p)) return '0.00';
  return (q * p).toFixed(2);
}

function calculateFormTotal(lineItems: LineItemFormData[]): string {
  let total = 0;
  for (const item of lineItems) {
    const q = parseFloat(item.quantity);
    const p = parseFloat(item.unitPrice);
    if (!isNaN(q) && !isNaN(p)) {
      total += q * p;
    }
  }
  return total.toFixed(2);
}

// ---------- Component ----------

export default function QuotesPage() {
  const { tenantId } = useTenant();

  // List state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Actions dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    if (!tenantId) return;

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiClient.getRaw<QuotesResponse>(
        `/api/tenants/${tenantId}/quotes?${params.toString()}`,
      );
      setQuotes(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load quotes',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, page, statusFilter]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchQuotes();
  }, [tenantId, fetchQuotes]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingQuote(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (quote: Quote) => {
    setEditingQuote(quote);
    setFormData({
      clientEmail: quote.clientEmail,
      validUntil: quote.validUntil ? quote.validUntil.slice(0, 10) : '',
      lineItems: quote.lineItems.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: item.unitPrice,
      })),
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  // Line item management
  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...EMPTY_LINE_ITEM }],
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItemFormData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  // Submit form
  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    if (!formData.clientEmail.trim()) {
      setFormError('Client email is required');
      return;
    }

    if (!formData.validUntil) {
      setFormError('Valid until date is required');
      return;
    }

    const validLineItems = formData.lineItems.filter(
      (item) => item.description.trim() && item.unitPrice,
    );
    if (validLineItems.length === 0) {
      setFormError('At least one line item is required');
      return;
    }

    setSaving(true);

    const payload = {
      clientEmail: formData.clientEmail.trim(),
      validUntil: formData.validUntil,
      lineItems: validLineItems.map((item) => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: item.unitPrice,
        total: String((parseFloat(item.quantity) || 1) * parseFloat(item.unitPrice || '0')),
      })),
    };

    const previousQuotes = quotes;

    if (editingQuote) {
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === editingQuote.id
            ? { ...q, clientEmail: payload.clientEmail, validUntil: payload.validUntil }
            : q,
        ),
      );
    } else {
      const optimisticQuote: Quote = {
        id: `optimistic-${Date.now()}`,
        quoteNumber: '',
        clientName: '',
        currency: 'USD',
        ...payload,
        status: 'DRAFT',
        total: String(
          validLineItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 1) * parseFloat(item.unitPrice || '0'),
            0,
          ),
        ),
        createdAt: new Date().toISOString(),
      };
      setQuotes((prev) => [optimisticQuote, ...prev]);
    }
    setDialogOpen(false);

    try {
      if (editingQuote) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/quotes/${editingQuote.id}`,
          payload,
        );
        setSuccess('Quote updated successfully');
      } else {
        await apiClient.post(
          `/api/tenants/${tenantId}/quotes`,
          payload,
        );
        setSuccess('Quote created successfully');
      }

      await fetchQuotes();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setQuotes(previousQuotes);
      setDialogOpen(true);
      setFormError(
        err instanceof Error ? err.message : 'Failed to save quote',
      );
    } finally {
      setSaving(false);
    }
  };

  // Send quote
  const handleSendQuote = async (quote: Quote) => {
    if (!tenantId) return;
    setOpenActionId(null);

    const previousQuotes = quotes;
    setQuotes((prev) =>
      prev.map((q) => (q.id === quote.id ? { ...q, status: 'SENT' } : q)),
    );

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/quotes/${quote.id}/send`,
      );
      setSuccess('Quote sent successfully');
      await fetchQuotes();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setQuotes(previousQuotes);
      setError(
        err instanceof Error ? err.message : 'Failed to send quote',
      );
    }
  };

  // Void quote
  const handleVoidQuote = async (quote: Quote) => {
    if (!tenantId) return;
    setOpenActionId(null);

    const previousQuotes = quotes;
    setQuotes((prev) =>
      prev.map((q) => (q.id === quote.id ? { ...q, status: 'VOIDED' as const } : q)),
    );

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/quotes/${quote.id}/void`,
      );
      setSuccess('Quote voided successfully');
      await fetchQuotes();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setQuotes(previousQuotes);
      setError(
        err instanceof Error ? err.message : 'Failed to void quote',
      );
    }
  };

  const handlePreviousPage = () => {
    setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  // Close actions dropdown when clicking outside
  useEffect(() => {
    if (!openActionId) return;

    const handleClick = () => setOpenActionId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openActionId]);

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quotes</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage quotes for clients
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Quote
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="quote-status-filter" className="sr-only">
            Status Filter
          </Label>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger id="quote-status-filter" className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value || 'all'} value={s.value || 'all'}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Quotes
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No quotes yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first quote to send pricing details to clients.
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Quote
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Valid Until</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {quote.clientName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {quote.clientEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap md:table-cell">
                        {formatAmount(quote.total, quote.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getQuoteStatusColor(quote.status)}
                        >
                          {formatStatus(quote.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap sm:table-cell">
                        {format(new Date(quote.validUntil), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">
                        {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId(
                                openActionId === quote.id ? null : quote.id,
                              );
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>

                          {openActionId === quote.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                onClick={() => openEditDialog(quote)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              {quote.status === 'DRAFT' && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                  onClick={() => void handleSendQuote(quote)}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Send
                                </button>
                              )}
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                onClick={() => void handleVoidQuote(quote)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Void
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuote ? 'Edit Quote' : 'Create Quote'}
            </DialogTitle>
            <DialogDescription>
              {editingQuote
                ? 'Update the quote details below'
                : 'Create a new quote for a client'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Client Email */}
            <div className="space-y-2">
              <Label htmlFor="quote-client-email">Client Email</Label>
              <Input
                id="quote-client-email"
                type="email"
                value={formData.clientEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientEmail: e.target.value,
                  }))
                }
                placeholder="client@example.com"
              />
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="quote-valid-until">Valid Until</Label>
              <Input
                id="quote-valid-until"
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    validUntil: e.target.value,
                  }))
                }
              />
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Line Item
                </Button>
              </div>

              {formData.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-md border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, 'description', e.target.value)
                      }
                    />
                    <div className="flex gap-2">
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(index, 'quantity', e.target.value)
                          }
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(index, 'unitPrice', e.target.value)
                          }
                        />
                      </div>
                      <div className="flex w-24 items-center justify-end text-sm font-medium">
                        ${calculateLineItemTotal(item.quantity, item.unitPrice)}
                      </div>
                    </div>
                  </div>
                  {formData.lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-destructive hover:text-destructive"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-end border-t pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="text-lg font-semibold">
                    ${calculateFormTotal(formData.lineItems)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitForm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingQuote ? 'Updating...' : 'Creating...'}
                </>
              ) : editingQuote ? (
                'Update Quote'
              ) : (
                'Create Quote'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
