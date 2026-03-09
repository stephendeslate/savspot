'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import {
  getStatusColor,
  formatAmount,
  formatStatus,
} from '@/lib/format-utils';

// ---------- Types ----------

interface PortalBooking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  businessName: string;
  totalAmount: string;
  currency: string;
}

interface BookingsResponse {
  data: PortalBooking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------- Constants ----------

const STATUS_OPTIONS = [
  { value: '', label: 'All Bookings' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

const PAGE_LIMIT = 10;

// ---------- Component ----------

export default function PortalBookingsPage() {
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', String(PAGE_LIMIT));
        if (statusFilter) params.set('status', statusFilter);

        const res = await apiClient.getRaw<BookingsResponse>(
          `/api/portal/bookings?${params.toString()}`,
        );
        setBookings(res.data);
        setTotal(res.meta.total);
        setPage(res.meta.page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load bookings',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    void fetchBookings(1);
  }, [fetchBookings]);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      void fetchBookings(page - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(total / PAGE_LIMIT);
    if (page < totalPages) {
      void fetchBookings(page + 1);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ---------- Loading ----------

  if (isLoading && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your appointments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="status-filter" className="sr-only">
            Filter by status
          </Label>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-40"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Mobile: Card view */}
      <div className="space-y-3 md:hidden">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-sm font-medium">No bookings found</h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {statusFilter
                    ? 'No bookings match the selected filter. Try selecting a different status.'
                    : 'You haven\'t made any bookings yet. When you do, they\'ll appear here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/portal/bookings/${booking.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {booking.serviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(booking.startTime),
                          'MMM d, yyyy \u00b7 h:mm a',
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className={getStatusColor(booking.status)}
                      >
                        {formatStatus(booking.status)}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatAmount(booking.totalAmount, booking.currency)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: Table view */}
      <Card className="hidden md:block">
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
              <CalendarCheck className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium">No bookings found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {statusFilter
                  ? 'No bookings match the selected filter. Try selecting a different status.'
                  : 'You haven\'t made any bookings yet. When you do, they\'ll appear here.'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.serviceName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.businessName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(
                          new Date(booking.startTime),
                          'MMM d, yyyy h:mm a',
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAmount(booking.totalAmount, booking.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(booking.status)}
                        >
                          {formatStatus(booking.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/portal/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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

      {/* Mobile pagination */}
      {totalPages > 1 && bookings.length > 0 && (
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
