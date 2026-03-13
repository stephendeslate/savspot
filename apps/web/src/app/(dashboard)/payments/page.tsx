'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  CreditCard,
  DollarSign,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import {
  getPaymentStatusColor,
  formatAmount,
  formatStatus,
  formatPaymentType,
} from '@/lib/format-utils';

// ---------- Types ----------

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  type: string;
  createdAt: string;
  booking: {
    id: string;
    startTime: string;
    service: {
      id: string;
      name: string;
    };
    client: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}

interface PaymentsResponse {
  data: Payment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PaymentStats {
  totalRevenue: string;
  thisMonth: string;
  pendingPayments: string;
  refunded: string;
}

// ---------- Constants ----------

const PAYMENT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const PAGE_LIMIT = 20;

// ---------- Component ----------

export default function PaymentsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  // Data state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: '0',
    thisMonth: '0',
    pendingPayments: '0',
    refunded: '0',
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchPayments = useCallback(
    async (pageNum: number) => {
      if (!tenantId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', String(PAGE_LIMIT));
        if (statusFilter) params.set('status', statusFilter);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (search) params.set('search', search);

        const res = await apiClient.getRaw<PaymentsResponse>(
          `/api/tenants/${tenantId}/payments?${params.toString()}`,
        );
        setPayments(res.data);
        setTotal(res.meta.total);
        setPage(res.meta.page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load payments',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, statusFilter, startDate, endDate, search],
  );

  const fetchStats = useCallback(async () => {
    if (!tenantId) return;

    setStatsLoading(true);
    try {
      const data = await apiClient.get<PaymentStats>(
        `/api/tenants/${tenantId}/payments/stats`,
      );
      setStats(data);
    } catch {
      // Stats are non-critical, silently fail
    } finally {
      setStatsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      setStatsLoading(false);
      return;
    }
    void fetchPayments(1);
    void fetchStats();
  }, [tenantId, fetchPayments, fetchStats]);

  const handleApplyFilters = () => {
    void fetchPayments(1);
  };

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

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ---------- Stat cards ----------

  const statCards = [
    {
      name: 'Total Revenue',
      value: formatAmount(stats.totalRevenue, 'USD'),
      icon: DollarSign,
      description: 'All time earnings',
    },
    {
      name: 'This Month',
      value: formatAmount(stats.thisMonth, 'USD'),
      icon: TrendingUp,
      description: 'Current month revenue',
    },
    {
      name: 'Pending Payments',
      value: formatAmount(stats.pendingPayments, 'USD'),
      icon: AlertCircle,
      description: 'Awaiting processing',
    },
    {
      name: 'Refunded',
      value: formatAmount(stats.refunded, 'USD'),
      icon: RotateCcw,
      description: 'Total refunds issued',
    },
  ];

  // ---------- Loading ----------

  if (isLoading && payments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-1 h-3 w-28" />
              </CardContent>
            </Card>
          ))}
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
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payments</h2>
          <p className="text-sm text-muted-foreground">
            Track revenue, payments, and refunds
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-1 h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className={showFilters ? '' : 'hidden lg:block'}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="payment-filter-status">Status</Label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
              >
                <SelectTrigger id="payment-filter-status" className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value || 'all'} value={s.value || 'all'}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="payment-filter-start">Start Date</Label>
              <Input
                id="payment-filter-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="payment-filter-end">End Date</Label>
              <Input
                id="payment-filter-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="payment-filter-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="payment-filter-search"
                  type="text"
                  placeholder="Client name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={handleApplyFilters} className="shrink-0">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Payments
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No payments yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Payments will appear here when clients pay for bookings through
                online payment or when you record offline payments.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/bookings/${payment.booking.id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/bookings/${payment.booking.id}`);
                        }
                      }}
                    >
                      <TableCell className="hidden whitespace-nowrap sm:table-cell">
                        {format(
                          new Date(payment.createdAt),
                          'MMM d, yyyy',
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.booking.client ? (
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {payment.booking.client.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground sm:hidden">
                              {format(
                                new Date(payment.createdAt),
                                'MMM d, yyyy',
                              )}
                            </div>
                            <div className="hidden text-xs text-muted-foreground sm:block">
                              {payment.booking.client.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Guest</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {payment.booking.service.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getPaymentStatusColor(payment.status)}
                        >
                          {formatStatus(payment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">
                          {formatPaymentType(payment.type)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
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
    </div>
  );
}
