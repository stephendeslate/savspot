'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Eye,
  Filter,
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { queryKeys } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { WalkInDialog } from '@/components/bookings/walk-in-dialog';
import {
  getStatusColor,
  getSourceColor,
  formatAmount,
  formatStatus,
} from '@/lib/format-utils';

// ---------- Types ----------

interface BookingService {
  id: string;
  name: string;
  durationMinutes: number;
}

interface BookingClient {
  id: string;
  name: string;
  email: string;
}

interface BookingPayment {
  id: string;
  status: string;
  amount: string;
  paymentType: string;
}

interface Booking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  currency: string;
  guestCount: number | null;
  notes: string | null;
  source: string;
  createdAt: string;
  service: BookingService;
  client: BookingClient | null;
  payments: BookingPayment[];
}

interface BookingsResponse {
  data: Booking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------- Component ----------

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

const PAGE_LIMIT = 20;

export default function BookingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Filter state (UI state)
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Walk-in dialog
  const [walkInOpen, setWalkInOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_LIMIT),
    };
    if (statusFilter) params['status'] = statusFilter;
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    if (debouncedSearch) params['search'] = debouncedSearch;
    return params;
  }, [page, statusFilter, startDate, endDate, debouncedSearch]);

  const { data: bookingsRes, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.bookings(tenantId!, queryParams),
    queryFn: () => {
      const searchParams = new URLSearchParams(queryParams).toString();
      return apiClient.getRaw<BookingsResponse>(
        `/api/tenants/${tenantId}/bookings?${searchParams}`,
      );
    },
    enabled: !!tenantId,
  });

  const bookings = bookingsRes?.data ?? [];
  const total = bookingsRes?.meta?.total ?? 0;
  const currentPage = bookingsRes?.meta?.page ?? 1;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Failed to load bookings')
    : null;
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const handleApplyFilters = () => {
    setPage(1);
  };

  const handlePreviousPage = () => {
    setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  const handleWalkInSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['bookings', tenantId] });
  };

  // ---------- Loading ----------

  if (isLoading && bookings.length === 0) {
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
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track all your bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button onClick={() => setWalkInOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Walk-in
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className={showFilters ? '' : 'hidden lg:block'}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value || 'all'} value={s.value || 'all'}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter-start-date">Start Date</Label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter-end-date">End Date</Label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
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
            All Bookings
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No bookings yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Bookings will appear here when clients book your services or
                you add walk-in bookings.
              </p>
              <Button className="mt-4" onClick={() => setWalkInOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add a walk-in
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="hidden sm:table-cell">Date/Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Source</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    >
                      <TableCell>
                        {booking.client ? (
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {booking.client.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground sm:hidden">
                              {format(
                                new Date(booking.startTime),
                                'MMM d, h:mm a',
                              )}
                            </div>
                            <div className="hidden text-xs text-muted-foreground sm:block">
                              {booking.client.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {booking.source === 'WALK_IN'
                              ? 'Walk-in'
                              : 'Guest'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{booking.service.name}</TableCell>
                      <TableCell className="hidden whitespace-nowrap sm:table-cell">
                        {format(
                          new Date(booking.startTime),
                          'MMM d, yyyy h:mm a',
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(booking.status)}
                        >
                          {formatStatus(booking.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap md:table-cell">
                        {formatAmount(
                          booking.totalAmount,
                          booking.currency,
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className={getSourceColor(booking.source)}
                        >
                          {formatStatus(booking.source)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/bookings/${booking.id}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
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

      {/* Walk-in Dialog */}
      {tenantId && (
        <WalkInDialog
          open={walkInOpen}
          onOpenChange={setWalkInOpen}
          tenantId={tenantId}
          onSuccess={handleWalkInSuccess}
        />
      )}
    </div>
  );
}
