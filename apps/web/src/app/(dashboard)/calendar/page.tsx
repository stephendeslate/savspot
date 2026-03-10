'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type View,
  type Event,
  type SlotInfo,
} from 'react-big-calendar';
import withDragAndDrop, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { WalkInDialog } from '@/components/bookings/walk-in-dialog';
import { BookingPopover } from '@/components/calendar/booking-popover';
import { getStatusStyle, getClientDisplayName } from './calendar-helpers';

// ---------- Localizer ----------

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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

interface Booking {
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

interface BookingsResponse {
  data: Booking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: Booking;
  status?: string;
  isBlocked?: boolean;
}

// ---------- DnD Calendar ----------

const DnDCalendar = withDragAndDrop<CalendarEvent>(BigCalendar as never);

// Statuses that can be dragged to reschedule
const DRAGGABLE_STATUSES = new Set(['CONFIRMED', 'PENDING']);

// ---------- Helpers ----------

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

// ---------- Component ----------

export default function CalendarPage() {
  const { tenantId } = useTenant();
  const isMobile = useIsMobile();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(isMobile ? 'agenda' : 'week');

  // Walk-in dialog state
  const [walkInOpen, setWalkInOpen] = useState(false);

  // Booking popover state
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // DnD reschedule state
  const [rescheduleConfirm, setRescheduleConfirm] = useState<{
    bookingId: string;
    title: string;
    oldStart: Date;
    oldEnd: Date;
    newStart: Date;
    newEnd: Date;
  } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Track whether initial mobile check happened
  useEffect(() => {
    if (isMobile) {
      setCurrentView('agenda');
    }
  }, [isMobile]);

  // Calculate date range for the current view
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    switch (currentView) {
      case 'month':
        start = subDays(startOfMonth(currentDate), 7);
        end = addDays(endOfMonth(currentDate), 7);
        break;
      case 'week':
        start = subDays(startOfWeek(currentDate, { weekStartsOn: 0 }), 1);
        end = addDays(start, 9);
        break;
      case 'day':
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case 'agenda':
        start = startOfDay(currentDate);
        end = addDays(start, 30);
        break;
      default:
        start = subDays(startOfMonth(currentDate), 7);
        end = addDays(endOfMonth(currentDate), 7);
    }

    return { start, end };
  }, [currentDate, currentView]);

  const fetchEvents = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!tenantId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('startDate', startDate.toISOString());
        params.set('endDate', endDate.toISOString());
        params.set('limit', '500');

        const res = await apiClient.getRaw<BookingsResponse>(
          `/api/tenants/${tenantId}/bookings?${params.toString()}`,
        );

        const bookingEvents: CalendarEvent[] = res.data.map((booking) => ({
          id: booking.id,
          title: `${booking.service.name} - ${getClientDisplayName(booking)}`,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          resource: booking,
          status: booking.status,
        }));

        setEvents(bookingEvents);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load calendar events',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchEvents(dateRange.start, dateRange.end);
  }, [tenantId, dateRange.start, dateRange.end, fetchEvents]);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.isBlocked) return;
      if (event.resource) {
        setSelectedBooking(event.resource);
        setPopoverOpen(true);
      }
    },
    [],
  );

  const handlePopoverStatusChange = useCallback(() => {
    void fetchEvents(dateRange.start, dateRange.end);
  }, [fetchEvents, dateRange.start, dateRange.end]);

  const handleSelectSlot = useCallback((_info: SlotInfo) => {
    void _info;
    setWalkInOpen(true);
  }, []);

  const handleWalkInSuccess = useCallback(() => {
    void fetchEvents(dateRange.start, dateRange.end);
  }, [fetchEvents, dateRange.start, dateRange.end]);

  const handleEventDrop = useCallback(
    ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      if (!event.resource || !DRAGGABLE_STATUSES.has(event.resource.status)) {
        return;
      }
      setRescheduleConfirm({
        bookingId: event.id,
        title: event.title,
        oldStart: event.start as Date,
        oldEnd: event.end as Date,
        newStart: start as Date,
        newEnd: end as Date,
      });
    },
    [],
  );

  const handleEventResize = useCallback(
    ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      if (!event.resource || !DRAGGABLE_STATUSES.has(event.resource.status)) {
        return;
      }
      setRescheduleConfirm({
        bookingId: event.id,
        title: event.title,
        oldStart: event.start as Date,
        oldEnd: event.end as Date,
        newStart: start as Date,
        newEnd: end as Date,
      });
    },
    [],
  );

  const confirmReschedule = useCallback(async () => {
    if (!rescheduleConfirm || !tenantId) return;

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/bookings/${rescheduleConfirm.bookingId}/reschedule`,
        {
          startTime: rescheduleConfirm.newStart.toISOString(),
          endTime: rescheduleConfirm.newEnd.toISOString(),
        },
      );

      setRescheduleConfirm(null);
      void fetchEvents(dateRange.start, dateRange.end);
    } catch (err) {
      setRescheduleError(
        err instanceof Error ? err.message : 'Failed to reschedule booking',
      );
    } finally {
      setIsRescheduling(false);
    }
  }, [rescheduleConfirm, tenantId, fetchEvents, dateRange.start, dateRange.end]);

  const draggableAccessor = useCallback(
    (event: CalendarEvent) => {
      return DRAGGABLE_STATUSES.has(event.resource?.status ?? '');
    },
    [],
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      if (event.isBlocked) {
        return {
          style: {
            backgroundColor: '#e5e7eb',
            color: '#6b7280',
            borderColor: '#d1d5db',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            cursor: 'default',
          } as React.CSSProperties,
        };
      }

      const statusStyle = getStatusStyle(event.status ?? 'CONFIRMED');
      return {
        style: {
          ...statusStyle,
          borderRadius: '4px',
          border: `1px solid ${statusStyle.borderColor}`,
          padding: '2px 4px',
          fontSize: '0.75rem',
          cursor: 'pointer',
        } as React.CSSProperties,
      };
    },
    [],
  );

  // ---------- Loading ----------

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[600px] w-full" />
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
        <h2 className="text-lg font-semibold">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          View and manage your schedule
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Confirmed', color: 'bg-blue-500' },
          { label: 'Pending', color: 'bg-amber-500' },
          { label: 'In Progress', color: 'bg-purple-500' },
          { label: 'Completed', color: 'bg-green-500' },
          { label: 'Cancelled', color: 'bg-red-500' },
          { label: 'No Show', color: 'bg-gray-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-3 w-3 rounded-sm ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          <style>{`
            .rbc-calendar {
              font-family: inherit;
            }
            .rbc-toolbar {
              flex-wrap: wrap;
              gap: 0.5rem;
              margin-bottom: 1rem;
            }
            .rbc-toolbar button {
              border-radius: 0.375rem;
              padding: 0.375rem 0.75rem;
              font-size: 0.875rem;
              border-color: var(--border);
              color: var(--foreground);
              background-color: var(--background);
            }
            .rbc-toolbar button:hover {
              background-color: var(--accent);
              color: var(--accent-foreground);
            }
            .rbc-toolbar button.rbc-active {
              background-color: var(--primary);
              color: var(--primary-foreground);
              border-color: var(--primary);
            }
            .rbc-toolbar .rbc-toolbar-label {
              font-weight: 600;
              font-size: 1rem;
            }
            .rbc-header {
              padding: 0.5rem;
              font-weight: 500;
              font-size: 0.875rem;
              border-color: var(--border);
            }
            .rbc-month-view,
            .rbc-time-view {
              border-color: var(--border);
              border-radius: 0.5rem;
              overflow: hidden;
            }
            .rbc-day-bg + .rbc-day-bg,
            .rbc-month-row + .rbc-month-row {
              border-color: var(--border);
            }
            .rbc-off-range-bg {
              background-color: color-mix(in oklch, var(--muted) 30%, transparent);
            }
            .rbc-today {
              background-color: color-mix(in oklch, var(--primary) 5%, transparent);
            }
            .rbc-time-header-content,
            .rbc-time-content {
              border-color: var(--border);
            }
            .rbc-timeslot-group {
              border-color: var(--border);
              min-height: 3rem;
            }
            .rbc-time-slot {
              border-color: color-mix(in oklch, var(--border) 50%, transparent);
            }
            .rbc-label {
              font-size: 0.75rem;
              color: var(--muted-foreground);
            }
            .rbc-current-time-indicator {
              background-color: var(--primary);
            }
            .rbc-event {
              border: none !important;
            }
            .rbc-event-label {
              font-size: 0.7rem;
            }
            .rbc-event-content {
              font-size: 0.75rem;
            }
            .rbc-show-more {
              color: var(--primary);
              font-size: 0.75rem;
              font-weight: 500;
            }
            .rbc-agenda-view table.rbc-agenda-table {
              border-color: var(--border);
            }
            .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
              border-color: var(--border);
              padding: 0.5rem 1rem;
              font-weight: 500;
              font-size: 0.875rem;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
              border-color: var(--border);
              padding: 0.5rem 1rem;
              font-size: 0.875rem;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr {
              border-color: var(--border);
            }
            .rbc-day-slot .rbc-time-slot {
              border-color: color-mix(in oklch, var(--border) 30%, transparent);
            }
            /* Mobile polish: larger tap targets */
            @media (max-width: 767px) {
              .rbc-event {
                min-height: 44px !important;
                display: flex !important;
                align-items: center !important;
              }
              .rbc-event-content {
                font-size: 0.8rem;
                line-height: 1.2;
              }
              .rbc-toolbar {
                justify-content: center;
              }
              .rbc-toolbar button {
                padding: 0.5rem 0.875rem;
                min-height: 44px;
                font-size: 0.8rem;
              }
              .rbc-toolbar .rbc-toolbar-label {
                width: 100%;
                text-align: center;
                order: -1;
                margin-bottom: 0.5rem;
              }
              .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
                padding: 0.75rem 0.5rem;
                min-height: 44px;
              }
              .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
                padding: 0.75rem 0.5rem;
              }
            }
          `}</style>
          <div style={{ minHeight: 600 }}>
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={['month', 'week', 'day', 'agenda']}
              defaultView={isMobile ? 'agenda' : 'week'}
              view={currentView}
              date={currentDate}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              draggableAccessor={draggableAccessor}
              resizable
              selectable
              eventPropGetter={eventStyleGetter}
              style={{ height: 650 }}
              step={15}
              timeslots={4}
              min={new Date(1970, 0, 1, 7, 0, 0)}
              max={new Date(1970, 0, 1, 21, 0, 0)}
              popup
              showMultiDayTimes
            />
          </div>
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

      {/* Booking Popover */}
      {tenantId && (
        <BookingPopover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          booking={selectedBooking}
          tenantId={tenantId}
          onStatusChange={handlePopoverStatusChange}
        />
      )}

      {/* Reschedule Confirmation Dialog */}
      <Dialog
        open={!!rescheduleConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleConfirm(null);
            setRescheduleError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              {rescheduleConfirm && (
                <>
                  Move <strong>{rescheduleConfirm.title}</strong> from{' '}
                  <strong>
                    {format(rescheduleConfirm.oldStart, 'MMM d, h:mm a')} -{' '}
                    {format(rescheduleConfirm.oldEnd, 'h:mm a')}
                  </strong>{' '}
                  to{' '}
                  <strong>
                    {format(rescheduleConfirm.newStart, 'MMM d, h:mm a')} -{' '}
                    {format(rescheduleConfirm.newEnd, 'h:mm a')}
                  </strong>
                  ?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {rescheduleError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {rescheduleError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleConfirm(null);
                setRescheduleError(null);
              }}
              disabled={isRescheduling}
            >
              Cancel
            </Button>
            <Button onClick={confirmReschedule} disabled={isRescheduling}>
              {isRescheduling ? 'Rescheduling...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
