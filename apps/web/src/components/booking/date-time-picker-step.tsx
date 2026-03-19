'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  format,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  subWeeks,
  startOfMonth,
  startOfWeek,
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
import { ChevronLeft, ChevronRight, Loader2, Zap, Bell, TrendingUp, Sparkles } from 'lucide-react';
import { Button, Skeleton } from '@savspot/ui';
import { FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { BookingSessionData, TimeSlot, PeakHoursConfig } from './booking-types';
import { API_URL } from './booking-types';
import { formatTimeDisplay } from '@/lib/booking-format-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DateTimePickerStepProps {
  tenantId: string;
  timezone: string;
  sessionId: string;
  serviceId: string;
  serviceDuration: number;
  staffId?: string;
  peakHoursConfig?: PeakHoursConfig | null;
  onSlotReserved: (data: Partial<BookingSessionData>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const POLL_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// Time grouping helpers
// ---------------------------------------------------------------------------

interface GroupedSlots {
  morning: TimeSlot[];
  afternoon: TimeSlot[];
  evening: TimeSlot[];
}

function groupSlotsByTimeOfDay(slots: TimeSlot[]): GroupedSlots {
  const groups: GroupedSlots = { morning: [], afternoon: [], evening: [] };
  for (const slot of slots) {
    const hour = parseInt(slot.startTime.split(':')[0] ?? '0', 10);
    if (hour < 12) {
      groups.morning.push(slot);
    } else if (hour < 17) {
      groups.afternoon.push(slot);
    } else {
      groups.evening.push(slot);
    }
  }
  return groups;
}

function isSlotPeak(
  slot: TimeSlot,
  selectedDate: Date | null,
  config: PeakHoursConfig | null | undefined,
): boolean {
  if (!config || !selectedDate) return false;
  const dayOfWeek = getDay(selectedDate);
  if (!config.peakDays.includes(dayOfWeek)) return false;
  const slotTime = slot.startTime;
  return slotTime >= config.peakTimeStart && slotTime < config.peakTimeEnd;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateTimePickerStep({
  tenantId,
  sessionId,
  serviceId,
  serviceDuration,
  staffId,
  peakHoursConfig,
  onSlotReserved,
}: DateTimePickerStepProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reservingSlot, setReservingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const today = startOfDay(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSlotsRef = useRef<string>('');

  // -------------------------------------------------------------------------
  // Calendar generation (desktop month view)
  // -------------------------------------------------------------------------

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const leadingBlanks = Array.from({ length: startDayOfWeek }, (_, i) => i);

  // Mobile week strip
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  // -------------------------------------------------------------------------
  // Fetch time slots
  // -------------------------------------------------------------------------

  const fetchTimeSlots = useCallback(
    async (date: Date, silent = false) => {
      if (!silent) {
        setLoadingSlots(true);
        setError(null);
        setTimeSlots([]);
      }

      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const staffParam = staffId ? `&staffId=${staffId}` : '';
        const res = await fetch(
          `${API_URL}/api/tenants/${tenantId}/availability?serviceId=${serviceId}&startDate=${dateStr}&endDate=${dateStr}${staffParam}`,
        );
        if (!res.ok) {
          throw new Error('Failed to fetch available time slots');
        }
        const json = (await res.json()) as { data: TimeSlot[] };
        const newSlots = json.data;

        // For polling: detect removed slots (animate fade-out handled by key-based rendering)
        const newKey = newSlots.map((s) => `${s.date}-${s.startTime}`).join(',');
        if (silent && newKey !== prevSlotsRef.current) {
          setTimeSlots(newSlots);
        } else if (!silent) {
          setTimeSlots(newSlots);
        }
        prevSlotsRef.current = newKey;
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error ? err.message : 'Could not load time slots',
          );
        }
      } finally {
        if (!silent) {
          setLoadingSlots(false);
        }
      }
    },
    [tenantId, serviceId, staffId],
  );

  // Fetch on date selection
  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate, fetchTimeSlots]);

  // 30s polling for selected date
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (selectedDate) {
      pollRef.current = setInterval(() => {
        fetchTimeSlots(selectedDate, true);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedDate, fetchTimeSlots]);

  // -------------------------------------------------------------------------
  // "Next Available" shortcut
  // -------------------------------------------------------------------------

  const handleNextAvailable = useCallback(async () => {
    setLoadingNext(true);
    setError(null);

    try {
      const staffParam = staffId ? `&staffId=${staffId}` : '';
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/availability/next?serviceId=${serviceId}${staffParam}`,
      );
      if (!res.ok) throw new Error('Could not find next available date');

      const json = (await res.json()) as {
        data: { date: string; slots: TimeSlot[] } | null;
      };
      const result = json.data;

      if (result) {
        const nextDate = parseISO(result.date);
        setSelectedDate(nextDate);
        // Jump the calendar views to the right month/week
        setCurrentMonth(startOfMonth(nextDate));
        setWeekStart(startOfWeek(nextDate));
        // Pre-populate slots to avoid re-fetch flicker
        setTimeSlots(result.slots);
        prevSlotsRef.current = result.slots
          .map((s) => `${s.date}-${s.startTime}`)
          .join(',');
      } else {
        setError('No available slots found in the next 90 days.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not find availability',
      );
    } finally {
      setLoadingNext(false);
    }
  }, [tenantId, serviceId, staffId]);

  // -------------------------------------------------------------------------
  // Join waitlist
  // -------------------------------------------------------------------------

  const handleJoinWaitlist = useCallback(async () => {
    if (!selectedDate) return;
    setJoiningWaitlist(true);

    try {
      const res = await fetch(
        `${API_URL}/api/booking-sessions/${sessionId}/waitlist`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferredDate: format(selectedDate, 'yyyy-MM-dd'),
          }),
        },
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || 'Failed to join waitlist');
      }

      setWaitlistJoined(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not join waitlist',
      );
    } finally {
      setJoiningWaitlist(false);
    }
  }, [sessionId, selectedDate]);

  // -------------------------------------------------------------------------
  // Reserve a time slot
  // -------------------------------------------------------------------------

  const reserveSlot = async (slot: TimeSlot) => {
    const slotKey = `${slot.date}-${slot.startTime}`;
    setReservingSlot(slotKey);
    setError(null);

    try {
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
            ...(staffId ? { staffId } : {}),
            startTime: `${slot.date}T${slot.startTime}:00`,
            endTime: `${slot.date}T${endTime}:00`,
          }),
        },
      );

      if (res.status === 409) {
        setError(
          'This time was just booked. Please choose another slot.',
        );
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
  // Date selection handler (shared by mobile + desktop)
  // -------------------------------------------------------------------------

  const selectDate = (day: Date) => {
    setSelectedDate(day);
    // Sync both views
    setCurrentMonth(startOfMonth(day));
    setWeekStart(startOfWeek(day));
  };

  // -------------------------------------------------------------------------
  // Render: Time Slots (shared between layouts)
  // -------------------------------------------------------------------------

  const renderTimeSlots = () => {
    if (!selectedDate && !loadingSlots) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Select a date to see available times
        </div>
      );
    }

    if (loadingSlots) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
          <button
            type="button"
            className="mt-2 block text-xs underline"
            onClick={() => selectedDate && fetchTimeSlots(selectedDate)}
          >
            Retry
          </button>
        </div>
      );
    }

    if (!selectedDate) return null;

    if (timeSlots.length === 0) {
      return (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No available time slots for this date.
          </p>
          {waitlistJoined ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200">
              <Bell className="mb-1 inline-block h-4 w-4" /> You&apos;re on the
              waitlist! We&apos;ll notify you when a slot opens up.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleJoinWaitlist}
                disabled={joiningWaitlist}
              >
                {joiningWaitlist ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                Join Waitlist
              </Button>
              <p className="text-xs text-muted-foreground">
                Get notified when a slot opens up, or try &ldquo;Next
                Available&rdquo; above.
              </p>
            </div>
          )}
        </div>
      );
    }

    const grouped = groupSlotsByTimeOfDay(timeSlots);
    const sections: { label: string; slots: TimeSlot[] }[] = [
      { label: 'Morning', slots: grouped.morning },
      { label: 'Afternoon', slots: grouped.afternoon },
      { label: 'Evening', slots: grouped.evening },
    ].filter((s) => s.slots.length > 0);

    let globalIndex = 0;

    return (
      <>
        <p className="mb-3 text-sm font-medium">
          Available times for{' '}
          <span className="text-foreground">
            {format(selectedDate, 'EEEE, MMMM d')}
          </span>
        </p>

        {peakHoursConfig && (
          <div className="mb-3 flex gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-green-500" /> Best Value
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-orange-500" /> Peak
            </span>
          </div>
        )}

        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {section.slots.map((slot) => {
                  const slotKey = `${slot.date}-${slot.startTime}`;
                  const isReserving = reservingSlot === slotKey;
                  const isPeak = isSlotPeak(slot, selectedDate, peakHoursConfig);
                  const idx = globalIndex++;

                  return (
                    <FadeIn key={slotKey} delay={idx * 0.03}>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'w-full text-xs',
                          peakHoursConfig && !isPeak && 'border-green-200 dark:border-green-800',
                          peakHoursConfig && isPeak && 'border-orange-200 dark:border-orange-800',
                        )}
                        disabled={!!reservingSlot}
                        onClick={() => reserveSlot(slot)}
                      >
                        {isReserving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            {formatTimeDisplay(slot.startTime)}
                            {peakHoursConfig && isPeak && (
                              <TrendingUp className="h-3 w-3 text-orange-500" />
                            )}
                            {peakHoursConfig && !isPeak && (
                              <Sparkles className="h-3 w-3 text-green-500" />
                            )}
                          </span>
                        )}
                      </Button>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {reservingSlot && (
          <p className="mt-3 text-xs text-muted-foreground">
            Reserving your time slot...
          </p>
        )}
      </>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Desktop Month Calendar
  // -------------------------------------------------------------------------

  const renderDesktopCalendar = () => (
    <div className="hidden md:block flex-1">
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
      <div className="grid grid-cols-7" role="grid" aria-label="Appointment calendar">
        {leadingBlanks.map((i) => (
          <div key={`blank-${i}`} className="p-1" role="gridcell" />
        ))}

        {daysInMonth.map((day) => {
          const isPast = isBefore(day, today);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isTodayDate = isToday(day);

          return (
            <div key={day.toISOString()} className="p-1" role="gridcell" aria-selected={isSelected}>
              <button
                type="button"
                disabled={isPast}
                onClick={() => selectDate(day)}
                aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                aria-disabled={isPast}
                aria-current={isTodayDate ? 'date' : undefined}
                className={cn(
                  'flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors',
                  isPast && 'cursor-not-allowed text-muted-foreground/30',
                  !isPast && !isSelected && 'hover:bg-accent cursor-pointer',
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
  );

  // -------------------------------------------------------------------------
  // Render: Mobile Horizontal Week Strip
  // -------------------------------------------------------------------------

  const renderMobileWeekStrip = () => (
    <div className="md:hidden">
      {/* Week navigation */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          disabled={isBefore(addDays(subWeeks(weekStart, 1), 6), today)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day pills — horizontal scroll with snap */}
      <div
        className="flex gap-1 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {weekDays.map((day) => {
          const isPast = isBefore(day, today);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => selectDate(day)}
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              aria-current={isTodayDate ? 'date' : undefined}
              data-selected={isSelected || undefined}
              style={{ scrollSnapAlign: 'center' }}
              className={cn(
                'flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center transition-colors',
                isPast && 'cursor-not-allowed opacity-30',
                !isPast && !isSelected && 'hover:bg-accent cursor-pointer',
                isSelected &&
                  'bg-primary text-primary-foreground',
                isTodayDate &&
                  !isSelected &&
                  'ring-1 ring-primary/50',
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {WEEKDAY_SHORT[getDay(day)]}
              </span>
              <span className={cn('text-base font-semibold', isSelected && 'text-primary-foreground')}>
                {format(day, 'd')}
              </span>
              <span className="text-[10px]">
                {format(day, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Pick a Date &amp; Time</h2>
          <p className="text-sm text-muted-foreground">
            Choose your preferred date and available time slot.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleNextAvailable}
          disabled={loadingNext}
        >
          {loadingNext ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Next Available</span>
          <span className="sm:hidden">Next</span>
        </Button>
      </div>

      {/* Screen reader announcement for slot selection */}
      <div aria-live="polite" className="sr-only" role="status">
        {selectedDate && !loadingSlots && timeSlots.length > 0 &&
          `${timeSlots.length} time slots available for ${format(selectedDate, 'EEEE, MMMM d')}`
        }
      </div>

      {/* Mobile week strip */}
      {renderMobileWeekStrip()}

      {/* Desktop layout: calendar + time slots side by side */}
      <div className="flex flex-col gap-6 md:flex-row">
        {renderDesktopCalendar()}

        {/* Time slots panel */}
        <div className="flex-1 md:max-w-xs">
          {renderTimeSlots()}
        </div>
      </div>
    </div>
  );
}
