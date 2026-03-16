'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  DollarSign,
  Mail,
  Save,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Skeleton, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@savspot/ui';
import { apiClient, ApiError } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';
import {
  getStatusColor,
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
  type: string;
}

interface StateHistoryEntry {
  id: string;
  fromState: string | null;
  toState: string;
  reason: string | null;
  createdAt: string;
}

interface BookingDetail {
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
  bookingStateHistory: StateHistoryEntry[];
}

// ---------- Component ----------

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useTenant();

  const bookingId = params['id'] as string;

  // Data state
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Notes editing
  const [editedNotes, setEditedNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('CLIENT_REQUEST');

  // Reschedule dialog
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');

  // Mark paid dialog
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidCurrency, setPaidCurrency] = useState('USD');
  const [paidMethod, setPaidMethod] = useState('CASH');

  const fetchBooking = useCallback(async () => {
    if (!tenantId || !bookingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<BookingDetail>(
        `/api/tenants/${tenantId}/bookings/${bookingId}`,
      );
      setBooking(data);
      setEditedNotes(data.notes ?? '');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load booking',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, bookingId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchBooking();
  }, [tenantId, fetchBooking]);

  // ---------- Action handlers ----------

  const handleConfirm = async () => {
    if (!tenantId || !bookingId || !booking) return;
    const previous = booking;
    setBooking((prev) => prev ? { ...prev, status: 'CONFIRMED' } : prev);
    setActionError(null);
    setActionLoading(true);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${bookingId}/confirm`,
      );
      await fetchBooking();
    } catch (err) {
      setBooking(previous);
      setActionError(
        err instanceof Error ? err.message : 'Failed to confirm booking',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!tenantId || !bookingId || !booking) return;
    const previous = booking;
    setBooking((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev);
    setCancelOpen(false);
    setActionError(null);
    setActionLoading(true);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${bookingId}/cancel`,
        { reason: cancelReason },
      );
      await fetchBooking();
    } catch (err) {
      setBooking(previous);
      setCancelOpen(true);
      setActionError(
        err instanceof Error ? err.message : 'Failed to cancel booking',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async () => {
    if (!tenantId || !bookingId || !booking) return;
    const previous = booking;
    setBooking((prev) => prev ? { ...prev, status: 'NO_SHOW' } : prev);
    setActionError(null);
    setActionLoading(true);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${bookingId}/no-show`,
      );
      await fetchBooking();
    } catch (err) {
      setBooking(previous);
      setActionError(
        err instanceof Error ? err.message : 'Failed to mark as no-show',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!tenantId || !bookingId || !booking) return;
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      setActionError('Please fill in all reschedule fields');
      return;
    }
    const startTime = new Date(
      `${rescheduleDate}T${rescheduleStartTime}`,
    ).toISOString();
    const endTime = new Date(
      `${rescheduleDate}T${rescheduleEndTime}`,
    ).toISOString();

    const previous = booking;
    setBooking((prev) => prev ? { ...prev, startTime, endTime } : prev);
    setRescheduleOpen(false);
    setActionError(null);
    setActionLoading(true);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${bookingId}/reschedule`,
        { startTime, endTime },
      );
      await fetchBooking();
    } catch (err) {
      setBooking(previous);
      if (err instanceof ApiError && err.status === 409) {
        setActionError(
          'This time slot conflicts with an existing booking. Please choose a different time.',
        );
      } else {
        setActionError(
          err instanceof Error ? err.message : 'Failed to reschedule booking',
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!tenantId || !bookingId || !booking) return;
    if (!paidAmount) {
      setActionError('Please enter a payment amount');
      return;
    }
    const previous = booking;
    const optimisticPayment: BookingPayment = {
      id: `optimistic-${Date.now()}`,
      status: 'COMPLETED',
      amount: paidAmount,
      type: paidMethod,
    };
    setBooking((prev) =>
      prev ? { ...prev, payments: [...prev.payments, optimisticPayment] } : prev,
    );
    setMarkPaidOpen(false);
    setActionError(null);
    setActionLoading(true);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${bookingId}/mark-paid`,
        {
          amount: parseFloat(paidAmount),
          currency: paidCurrency,
          paymentMethod: paidMethod,
        },
      );
      await fetchBooking();
    } catch (err) {
      setBooking(previous);
      setActionError(
        err instanceof Error ? err.message : 'Failed to mark as paid',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!tenantId || !bookingId || !booking) return;
    const previousNotes = booking.notes;
    setBooking((prev) =>
      prev ? { ...prev, notes: editedNotes || null } : prev,
    );
    setNotesSaving(true);
    try {
      await apiClient.patch(
        `/api/tenants/${tenantId}/bookings/${bookingId}`,
        { notes: editedNotes || null },
      );
    } catch (err) {
      setBooking((prev) =>
        prev ? { ...prev, notes: previousNotes } : prev,
      );
      setEditedNotes(previousNotes ?? '');
      setActionError(
        err instanceof Error ? err.message : 'Failed to save notes',
      );
    } finally {
      setNotesSaving(false);
    }
  };

  // Pre-populate reschedule dialog with current booking times
  const openRescheduleDialog = () => {
    if (booking) {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      setRescheduleDate(format(start, 'yyyy-MM-dd'));
      setRescheduleStartTime(format(start, 'HH:mm'));
      setRescheduleEndTime(format(end, 'HH:mm'));
    }
    setRescheduleOpen(true);
  };

  // Pre-populate mark paid dialog
  const openMarkPaidDialog = () => {
    if (booking) {
      setPaidAmount(booking.totalAmount);
      setPaidCurrency(booking.currency);
    }
    setPaidMethod('CASH');
    setMarkPaidOpen(true);
  };

  // Determine which actions are available
  const canConfirm = booking?.status === 'PENDING';
  const canCancel =
    booking?.status === 'PENDING' ||
    booking?.status === 'CONFIRMED' ||
    booking?.status === 'IN_PROGRESS';
  const canNoShow = booking?.status === 'CONFIRMED';
  const canReschedule = booking?.status === 'CONFIRMED';
  const hasPayments = booking?.payments && booking.payments.length > 0;
  const isPaid = hasPayments && booking.payments.some((p) => p.status === 'COMPLETED' || p.status === 'SUCCEEDED');
  const canMarkPaid = !isPaid && booking?.status !== 'CANCELLED' && booking?.status !== 'NO_SHOW';

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
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
          onClick={() => router.push(ROUTES.BOOKINGS)}
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
            onClick={() => router.push(ROUTES.BOOKINGS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                Booking
              </h2>
              <Badge
                variant="outline"
                className={getStatusColor(booking.status)}
              >
                {formatStatus(booking.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID: {booking.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date &amp; Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(booking.startTime),
                        'MMM d, yyyy h:mm a',
                      )}
                      {' - '}
                      {format(new Date(booking.endTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.service.durationMinutes} minutes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Service</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.service.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Guests</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.guestCount ?? 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Source</p>
                    <Badge
                      variant="outline"
                      className="mt-0.5"
                    >
                      {formatStatus(booking.source)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
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

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.client ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {booking.client.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {booking.client.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Walk-in client -- no client information on file.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Textarea
                  placeholder="Add notes about this booking..."
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={4}
                />
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={notesSaving || editedNotes === (booking.notes ?? '')}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-medium">
                    {formatAmount(booking.totalAmount, booking.currency)}
                  </span>
                </div>
                {hasPayments ? (
                  booking.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="space-y-2 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Status
                        </span>
                        <Badge variant="outline">
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
                {canMarkPaid && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={openMarkPaidDialog}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {(canConfirm || canCancel || canNoShow || canReschedule) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {canConfirm && (
                    <Button
                      className="w-full"
                      onClick={handleConfirm}
                      disabled={actionLoading}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {actionLoading ? 'Processing...' : 'Confirm Booking'}
                    </Button>
                  )}
                  {canReschedule && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={openRescheduleDialog}
                      disabled={actionLoading}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Reschedule
                    </Button>
                  )}
                  {canNoShow && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleNoShow}
                      disabled={actionLoading}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {actionLoading ? 'Processing...' : 'Mark No-Show'}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                      disabled={actionLoading}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {booking.bookingStateHistory && booking.bookingStateHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
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
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Cancellation Reason</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger id="cancel-reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT_REQUEST">Client Request</SelectItem>
                  <SelectItem value="ADMIN">Admin Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={actionLoading}
            >
              Keep Booking
            </Button>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Choose a new date and time for this booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule-start">Start Time</Label>
                <Input
                  id="reschedule-start"
                  type="time"
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-end">End Time</Label>
                <Input
                  id="reschedule-end"
                  type="time"
                  value={rescheduleEndTime}
                  onChange={(e) => setRescheduleEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={actionLoading}>
              {actionLoading ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Record an offline payment for this booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paid-amount">Amount</Label>
                <Input
                  id="paid-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid-currency">Currency</Label>
                <Select value={paidCurrency} onValueChange={setPaidCurrency}>
                  <SelectTrigger id="paid-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid-method">Payment Method</Label>
              <Select value={paidMethod} onValueChange={setPaidMethod}>
                <SelectTrigger id="paid-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card (offline)</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaidOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
