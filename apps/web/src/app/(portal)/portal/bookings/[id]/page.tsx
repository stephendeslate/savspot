'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Clock,
  CreditCard,
  Building2,
  Mail,
  Phone,
  XCircle,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Separator, Skeleton, Textarea, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import {
  getStatusColor,
  getPaymentStatusColor,
  formatAmount,
  formatStatus,
} from '@/lib/format-utils';

// ---------- Types ----------

interface BookingService {
  id: string;
  name: string;
  durationMinutes: number;
}

interface BookingBusiness {
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface BookingPayment {
  id: string;
  status: string;
  amount: string;
  type: string;
}

interface CancellationPolicy {
  type: 'FREE' | 'LATE_FEE' | 'NO_REFUND';
  description: string;
  feeAmount?: string;
  feeCurrency?: string;
}

interface StateHistoryEntry {
  id: string;
  fromState: string | null;
  toState: string;
  reason: string | null;
  createdAt: string;
}

interface PortalBookingDetail {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  currency: string;
  notes: string | null;
  createdAt: string;
  rescheduleCount?: number;
  service: BookingService & { maxRescheduleCount?: number };
  business: BookingBusiness;
  payments: BookingPayment[];
  cancellationPolicy: CancellationPolicy | null;
  bookingStateHistory: StateHistoryEntry[];
}

// ---------- Component ----------

export default function PortalBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params['id'] as string;

  const [booking, setBooking] = useState<PortalBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel dialog state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<PortalBookingDetail>(
        `/api/portal/bookings/${bookingId}`,
      );
      setBooking(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load booking details',
      );
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async () => {
    if (!bookingId) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      await apiClient.post(`/api/portal/bookings/${bookingId}/cancel`, {
        reason: cancelReason || undefined,
      });
      setCancelOpen(false);
      setCancelReason('');
      await fetchBooking();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : 'Failed to cancel booking',
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!bookingId || !rescheduleDate || !rescheduleTime) return;
    setRescheduleLoading(true);
    setRescheduleError(null);

    try {
      // Build ISO start time from date + time inputs
      const startTime = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      // Compute end time using service duration
      const durationMs = (booking?.service.durationMinutes ?? 60) * 60_000;
      const endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();

      await apiClient.post(`/api/portal/bookings/${bookingId}/reschedule`, {
        startTime,
        endTime,
        reason: rescheduleReason || undefined,
      });
      setRescheduleOpen(false);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      await fetchBooking();
    } catch (err) {
      setRescheduleError(
        err instanceof Error ? err.message : 'Failed to reschedule booking',
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  const canCancel =
    booking?.status === 'PENDING' || booking?.status === 'CONFIRMED';

  const maxReschedules = booking?.service.maxRescheduleCount ?? 3;
  const rescheduleCount = booking?.rescheduleCount ?? 0;
  const canReschedule =
    canCancel && rescheduleCount < maxReschedules;

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Error ----------

  if (error || !booking) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/portal/bookings')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>
        <div role="alert" className="rounded-md bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            {error ?? 'Booking not found'}
          </p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/portal/bookings')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {booking.service.name}
              </h1>
              <Badge
                variant="outline"
                className={getStatusColor(booking.status)}
              >
                {formatStatus(booking.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {booking.business.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canReschedule && (
            <Button
              variant="outline"
              onClick={() => setRescheduleOpen(true)}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(booking.startTime),
                        'EEEE, MMMM d, yyyy',
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.startTime), 'h:mm a')}
                      {' - '}
                      {format(new Date(booking.endTime), 'h:mm a')}
                      {' '}
                      ({booking.service.durationMinutes} min)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmount(booking.totalAmount, booking.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Booked On</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(booking.createdAt),
                        'MMM d, yyyy h:mm a',
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{booking.business.name}</p>
                </div>
                {booking.business.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${booking.business.contactEmail}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {booking.business.contactEmail}
                    </a>
                  </div>
                )}
                {booking.business.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${booking.business.contactPhone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {booking.business.contactPhone}
                    </a>
                  </div>
                )}
                {!booking.business.contactEmail &&
                  !booking.business.contactPhone && (
                    <p className="text-sm text-muted-foreground">
                      No contact information available.
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Status history timeline */}
          {booking.bookingStateHistory && booking.bookingStateHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {booking.bookingStateHistory.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-3">
                      {/* Connector line */}
                      {index < booking.bookingStateHistory.length - 1 && (
                        <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                      )}
                      {/* Dot */}
                      <div className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-primary bg-background" />
                      {/* Content */}
                      <div className="min-w-0 flex-1 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.fromState && (
                            <>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(entry.fromState)}`}
                              >
                                {formatStatus(entry.fromState)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                &rarr;
                              </span>
                            </>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(entry.toState)}`}
                          >
                            {formatStatus(entry.toState)}
                          </Badge>
                        </div>
                        {entry.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reason: {formatStatus(entry.reason)}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(
                            new Date(entry.createdAt),
                            'MMM d, yyyy h:mm a',
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Payment info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Amount
                  </span>
                  <span className="text-sm font-medium">
                    {formatAmount(booking.totalAmount, booking.currency)}
                  </span>
                </div>
                <Separator />
                {booking.payments.length > 0 ? (
                  booking.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="space-y-2 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Status
                        </span>
                        <Badge
                          variant="outline"
                          className={getPaymentStatusColor(payment.status)}
                        >
                          {formatStatus(payment.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Amount
                        </span>
                        <span className="text-sm">
                          {formatAmount(payment.amount, booking.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Method
                        </span>
                        <span className="text-sm">
                          {formatStatus(payment.type)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payment recorded yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {booking.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your appointment.
              {maxReschedules > 0 && (
                <span className="mt-1 block text-xs">
                  You can reschedule {maxReschedules - rescheduleCount} more time
                  {maxReschedules - rescheduleCount !== 1 ? 's' : ''}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-reason">
                Reason (optional)
              </Label>
              <Textarea
                id="reschedule-reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Why are you rescheduling?"
                rows={2}
              />
            </div>

            {rescheduleError && (
              <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {rescheduleError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleOpen(false);
                setRescheduleError(null);
              }}
              disabled={rescheduleLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduleLoading || !rescheduleDate || !rescheduleTime}
            >
              {rescheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cancellation policy display */}
            {booking.cancellationPolicy && (
              <div
                className={`rounded-md p-3 text-sm ${
                  booking.cancellationPolicy.type === 'FREE'
                    ? 'bg-green-50 text-green-800'
                    : booking.cancellationPolicy.type === 'LATE_FEE'
                      ? 'bg-yellow-50 text-yellow-800'
                      : 'bg-red-50 text-red-800'
                }`}
              >
                <p className="font-medium">Cancellation Policy</p>
                <p className="mt-1">
                  {booking.cancellationPolicy.description}
                </p>
                {booking.cancellationPolicy.feeAmount &&
                  booking.cancellationPolicy.feeCurrency && (
                    <p className="mt-1 font-medium">
                      Fee:{' '}
                      {formatAmount(
                        booking.cancellationPolicy.feeAmount,
                        booking.cancellationPolicy.feeCurrency,
                      )}
                    </p>
                  )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Reason for cancellation (optional)
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let us know why you're cancelling..."
                rows={3}
              />
            </div>

            {cancelError && (
              <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {cancelError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false);
                setCancelError(null);
              }}
              disabled={cancelLoading}
            >
              Keep Booking
            </Button>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
