'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';

// ---------- Types ----------

interface PaymentRecord {
  id: string;
  status: string;
  amount: string;
  paymentType: string;
  createdAt: string;
}

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  businessName: string;
  payments: PaymentRecord[];
}

interface PaymentsResponse {
  invoices: PortalInvoice[];
  total: number;
  page: number;
  limit: number;
}

// ---------- Helpers ----------

function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
    case 'SUCCEEDED':
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'SENT':
    case 'PENDING':
      return 'bg-blue-100 text-blue-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'REFUNDED':
      return 'bg-orange-100 text-orange-800';
    case 'VOID':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'SUCCEEDED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatAmount(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

// ---------- Constants ----------

const PAGE_LIMIT = 10;

// ---------- Component ----------

export default function PortalPaymentsPage() {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const fetchPayments = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', String(PAGE_LIMIT));

      const data = await apiClient.get<PaymentsResponse>(
        `/api/portal/payments?${params.toString()}`,
      );
      setInvoices(data.invoices);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load payments',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayments(1);
  }, [fetchPayments]);

  const handlePreviousPage = () => {
    if (page > 1) {
      void fetchPayments(page - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(total / PAGE_LIMIT);
    if (page < totalPages) {
      void fetchPayments(page + 1);
    }
  };

  const toggleExpanded = (invoiceId: string) => {
    setExpandedInvoice((prev) => (prev === invoiceId ? null : invoiceId));
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ---------- Loading ----------

  if (isLoading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
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
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your invoices and payment history
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Mobile: Card view */}
      <div className="space-y-3 md:hidden">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-sm font-medium">No invoices yet</h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Your invoices and payment history will appear here after your
                  first booking payment.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => toggleExpanded(invoice.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(invoice.createdAt),
                          'MMM d, yyyy',
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-medium">
                        {formatAmount(invoice.amount, invoice.currency)}
                      </span>
                      <Badge
                        variant="outline"
                        className={getInvoiceStatusColor(invoice.status)}
                      >
                        {formatStatus(invoice.status)}
                      </Badge>
                    </div>
                  </div>
                </button>

                {/* Expanded payment history */}
                {expandedInvoice === invoice.id &&
                  invoice.payments.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Payment History
                      </p>
                      <div className="space-y-2">
                        {invoice.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium">
                                {formatStatus(payment.paymentType)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  new Date(payment.createdAt),
                                  'MMM d, yyyy',
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">
                                {formatAmount(
                                  payment.amount,
                                  invoice.currency,
                                )}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPaymentStatusColor(payment.status)}`}
                              >
                                {formatStatus(payment.status)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop: Table view */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-base">
            Invoices
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium">No invoices yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Your invoices and payment history will appear here after your
                first booking payment.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <>
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invoice.businessName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(
                            new Date(invoice.createdAt),
                            'MMM d, yyyy',
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getInvoiceStatusColor(invoice.status)}
                          >
                            {formatStatus(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.payments.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(invoice.id)}
                            >
                              <CreditCard className="mr-1 h-3.5 w-3.5" />
                              {expandedInvoice === invoice.id
                                ? 'Hide'
                                : `${invoice.payments.length}`}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded payment rows */}
                      {expandedInvoice === invoice.id &&
                        invoice.payments.map((payment) => (
                          <TableRow
                            key={payment.id}
                            className="bg-muted/30"
                          >
                            <TableCell className="pl-8 text-muted-foreground">
                              Payment
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatStatus(payment.paymentType)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {format(
                                new Date(payment.createdAt),
                                'MMM d, yyyy',
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatAmount(
                                payment.amount,
                                invoice.currency,
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPaymentStatusColor(payment.status)}`}
                              >
                                {formatStatus(payment.status)}
                              </Badge>
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        ))}
                    </>
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

      {/* Mobile pagination */}
      {totalPages > 1 && invoices.length > 0 && (
        <div className="flex items-center justify-between md:hidden">
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
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
