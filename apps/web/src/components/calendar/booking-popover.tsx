'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Badge, Separator } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';

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

interface BookingResource {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  currency: string;
  notes: string | null;
  source: string;
  service: BookingService;
  client: BookingClient | null;
}

export interface BookingPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingResource | null;
  tenantId: string;
  onStatusChange: () => void;
}

// ---------- Status Helpers ----------

type StatusConfig = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
};

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Pending',
        variant: 'outline',
        className: 'border-amber-500 text-amber-600 bg-amber-50',
      };
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        variant: 'default',
        className: 'bg-blue-500 text-white border-blue-500',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        variant: 'default',
        className: 'bg-purple-500 text-white border-purple-500',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        variant: 'default',
        className: 'bg-green-500 text-white border-green-500',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        variant: 'destructive',
        className: 'bg-gray-400 text-white border-gray-400',
      };
    case 'NO_SHOW':
      return {
        label: 'No Show',
        variant: 'destructive',
        className: 'bg-red-500 text-white border-red-500',
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: '',
      };
  }
}

function getClientDisplayName(booking: BookingResource): string {
  if (booking.client) return booking.client.name;
  return booking.source === 'WALK_IN' ? 'Walk-in' : 'Guest';
}

// Statuses that are terminal / cannot be acted upon
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']);

// ---------- Component ----------

export function BookingPopover({
  open,
  onOpenChange,
  booking,
  tenantId,
  onStatusChange,
}: BookingPopoverProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!booking) return null;

  const statusConfig = getStatusConfig(booking.status);
  const isTerminal = TERMINAL_STATUSES.has(booking.status);
  const clientName = getClientDisplayName(booking);

  const handleAction = async (
    action: string,
    endpoint: string,
    body?: Record<string, unknown>,
  ) => {
    setIsLoading(action);
    setError(null);

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${booking.id}/${endpoint}`,
        body,
      );
      onStatusChange();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action.toLowerCase()}`,
      );
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{booking.service.name}</span>
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {clientName}
            {booking.client?.email ? ` (${booking.client.email})` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Booking Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium">
                {format(new Date(booking.startTime), 'EEE, MMM d, yyyy')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium">
                {format(new Date(booking.startTime), 'h:mm a')} &ndash;{' '}
                {format(new Date(booking.endTime), 'h:mm a')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">
                {booking.service.durationMinutes} min
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Source</span>
              <p className="font-medium capitalize">
                {booking.source.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>

          {booking.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes</span>
              <p className="font-medium">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        {!isTerminal && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {/* CONFIRMED -> Mark Arrived (IN_PROGRESS) */}
              {booking.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-700"
                  disabled={isLoading !== null}
                  onClick={() => handleAction('Mark Arrived', 'arrive')}
                >
                  {isLoading === 'Mark Arrived' ? 'Updating...' : 'Mark Arrived'}
                </Button>
              )}

              {/* CONFIRMED or IN_PROGRESS -> Mark Completed */}
              {(booking.status === 'CONFIRMED' ||
                booking.status === 'IN_PROGRESS') && (
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={isLoading !== null}
                  onClick={() => handleAction('Mark Completed', 'complete')}
                >
                  {isLoading === 'Mark Completed'
                    ? 'Updating...'
                    : 'Mark Completed'}
                </Button>
              )}

              {/* CONFIRMED -> No Show */}
              {booking.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={isLoading !== null}
                  onClick={() => handleAction('No Show', 'no-show')}
                >
                  {isLoading === 'No Show' ? 'Updating...' : 'No Show'}
                </Button>
              )}

              {/* Any active status -> Cancel */}
              {(booking.status === 'PENDING' ||
                booking.status === 'CONFIRMED' ||
                booking.status === 'IN_PROGRESS') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  disabled={isLoading !== null}
                  onClick={() =>
                    handleAction('Cancel', 'cancel', {
                      reason: 'Cancelled from calendar',
                    })
                  }
                >
                  {isLoading === 'Cancel' ? 'Cancelling...' : 'Cancel'}
                </Button>
              )}

              {/* PENDING -> Confirm */}
              {booking.status === 'PENDING' && (
                <Button
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isLoading !== null}
                  onClick={() => handleAction('Confirm', 'confirm')}
                >
                  {isLoading === 'Confirm' ? 'Confirming...' : 'Confirm'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
