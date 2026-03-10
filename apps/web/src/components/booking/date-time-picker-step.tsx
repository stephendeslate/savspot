'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isToday,
  startOfDay,
  getDay,
  addMinutes,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { BookingSessionData, TimeSlot } from './booking-types';
import { API_URL } from './booking-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DateTimePickerStepProps {
  tenantId: string;
  timezone: string;
  sessionId: string;
  serviceId: string;
  serviceDuration: number;
  onSlotReserved: (data: Partial<BookingSessionData>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateTimePickerStep({
  tenantId,
  sessionId,
  serviceId,
  serviceDuration,
  onSlotReserved,
}: DateTimePickerStepProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reservingSlot, setReservingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());

  // -------------------------------------------------------------------------
  // Calendar generation
  // -------------------------------------------------------------------------

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leading empty cells for alignment (Sunday = 0)
  const startDayOfWeek = getDay(monthStart);
  const leadingBlanks = Array.from({ length: startDayOfWeek }, (_, i) => i);

  // -------------------------------------------------------------------------
  // Fetch time slots when date is selected
  // -------------------------------------------------------------------------

  const fetchTimeSlots = useCallback(
    async (date: Date) => {
      setLoadingSlots(true);
      setError(null);
      setTimeSlots([]);

      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const res = await fetch(
          `${API_URL}/api/tenants/${tenantId}/availability?serviceId=${serviceId}&startDate=${dateStr}&endDate=${dateStr}`,
        );
        if (!res.ok) {
          throw new Error('Failed to fetch available time slots');
        }
        const json = (await res.json()) as { data: TimeSlot[] };
        setTimeSlots(json.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load time slots',
        );
      } finally {
        setLoadingSlots(false);
      }
    },
    [tenantId, serviceId],
  );

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate, fetchTimeSlots]);

  // -------------------------------------------------------------------------
  // Reserve a time slot
  // -------------------------------------------------------------------------

  const reserveSlot = async (slot: TimeSlot) => {
    const slotKey = `${slot.date}-${slot.startTime}`;
    setReservingSlot(slotKey);
    setError(null);

    try {
      // Calculate end time from start + duration
      const startDateTime = parseISO(`${slot.date}T${slot.startTime}`);
      const endDateTime = addMinutes(startDateTime, serviceDuration);
      const endTime = format(endDateTime, 'HH:mm');

      const res = await fetch(
        `${API_URL}/api/booking-sessions/${sessionId}/reserve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId,
            startTime: `${slot.date}T${slot.startTime}:00`,
            endTime: `${slot.date}T${endTime}:00`,
          }),
        },
      );

      if (res.status === 409) {
        setError(
          'This time slot is no longer available. Please choose another.',
        );
        // Refresh slots
        if (selectedDate) {
          fetchTimeSlots(selectedDate);
        }
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to reserve time slot');
      }

      const json = (await res.json()) as { data: { reservation: unknown } };

      await onSlotReserved({
        date: slot.date,
        startTime: slot.startTime,
        endTime,
        reservationId:
          (json.data.reservation as { id?: string })?.id ?? undefined,
      });
    } catch (err) {
      if (!error) {
        setError(
          err instanceof Error ? err.message : 'Could not reserve time slot',
        );
      }
    } finally {
      setReservingSlot(null);
    }
  };

  // -------------------------------------------------------------------------
  // Format time for display (24h → 12h)
  // -------------------------------------------------------------------------

  function formatTimeDisplay(time: string): string {
    const [hoursStr, minutesStr] = time.split(':');
    const hours = parseInt(hoursStr ?? '0', 10);
    const minutes = minutesStr ?? '00';
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Pick a Date &amp; Time</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose your preferred date and available time slot.
      </p>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Calendar */}
        <div className="flex-1">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="py-1 text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Leading blanks */}
            {leadingBlanks.map((i) => (
              <div key={`blank-${i}`} className="p-1" />
            ))}

            {/* Days */}
            {daysInMonth.map((day) => {
              const isPast = isBefore(day, today);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayDate = isToday(day);

              return (
                <div key={day.toISOString()} className="p-1">
                  <button
                    type="button"
                    disabled={isPast}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors',
                      isPast && 'cursor-not-allowed text-muted-foreground/30',
                      !isPast &&
                        !isSelected &&
                        'hover:bg-accent cursor-pointer',
                      isSelected &&
                        'bg-primary text-primary-foreground font-semibold',
                      isTodayDate &&
                        !isSelected &&
                        'border border-primary/50 font-medium',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time slots panel */}
        <div className="flex-1 lg:max-w-xs">
          {!selectedDate && (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Select a date to see available times
            </div>
          )}

          {selectedDate && loadingSlots && (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-md" />
                ))}
              </div>
            </div>
          )}

          {selectedDate && !loadingSlots && error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
              <button
                type="button"
                className="mt-2 block text-xs underline"
                onClick={() => fetchTimeSlots(selectedDate)}
              >
                Retry
              </button>
            </div>
          )}

          {selectedDate && !loadingSlots && !error && (
            <>
              <p className="mb-3 text-sm font-medium">
                Available times for{' '}
                <span className="text-foreground">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </span>
              </p>

              {timeSlots.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No available time slots for this date. Please try another
                  date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {timeSlots.map((slot, index) => {
                    const slotKey = `${slot.date}-${slot.startTime}`;
                    const isReserving = reservingSlot === slotKey;

                    return (
                      <FadeIn key={slotKey} delay={index * 0.03}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          disabled={!!reservingSlot}
                          onClick={() => reserveSlot(slot)}
                        >
                          {isReserving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            formatTimeDisplay(slot.startTime)
                          )}
                        </Button>
                      </FadeIn>
                    );
                  })}
                </div>
              )}

              {reservingSlot && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Reserving your time slot...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
