'use client';

import { Calendar, Download, ArrowRight, MapPin, UserPlus } from 'lucide-react';
import { Button, Separator } from '@savspot/ui';
import type { BookingSessionData } from './booking-types';
import { formatPrice, formatTimeDisplay, formatDate } from '@/lib/booking-format-utils';

// ---------------------------------------------------------------------------
// Google Calendar link builder
// ---------------------------------------------------------------------------

function buildGoogleCalendarUrl(data: {
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  tenantName: string;
  tenantAddress?: string;
}): string {
  const dtStart = data.date.replace(/-/g, '') + 'T' + data.startTime.replace(/:/g, '') + '00Z';
  const dtEnd = data.date.replace(/-/g, '') + 'T' + data.endTime.replace(/:/g, '') + '00Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${data.serviceName} at ${data.tenantName}`,
    dates: `${dtStart}/${dtEnd}`,
    details: 'Booked via SavSpot',
  });
  if (data.tenantAddress) {
    params.set('location', data.tenantAddress);
  }
  return `https://calendar.google.com/calendar/event?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// .ics file generation
// ---------------------------------------------------------------------------

function padTwo(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIcsDateTimeUtc(dateStr: string, timeStr: string): string {
  // dateStr: "2026-03-15", timeStr: "10:00"
  // Times from the API are already in UTC (ISO format). Produce UTC .ics format.
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  return `${year}${padTwo(month ?? 1)}${padTwo(day ?? 1)}T${padTwo(hours ?? 0)}${padTwo(minutes ?? 0)}00Z`;
}

function generateIcsFile(data: {
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  tenantName: string;
  timezone: string;
}): string {
  const dtStart = toIcsDateTimeUtc(data.date, data.startTime);
  const dtEnd = toIcsDateTimeUtc(data.date, data.endTime);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${padTwo(now.getUTCMonth() + 1)}${padTwo(now.getUTCDate())}T${padTwo(now.getUTCHours())}${padTwo(now.getUTCMinutes())}${padTwo(now.getUTCSeconds())}Z`;
  const uid = `${dtstamp}-${Math.random().toString(36).slice(2)}@savspot.com`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SavSpot//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `DTSTAMP:${dtstamp}`,
    `UID:${uid}`,
    `SUMMARY:${data.serviceName} at ${data.tenantName}`,
    `DESCRIPTION:Booked via SavSpot`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

function downloadIcsFile(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfirmationStepProps {
  sessionData: BookingSessionData;
  tenantName: string;
  tenantSlug: string;
  timezone: string;
  tenantAddress?: string;
  onBookAnother: () => void;
  isPreview?: boolean;
  isAuthenticated?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmationStep({
  sessionData,
  tenantName,
  tenantSlug,
  timezone,
  tenantAddress,
  onBookAnother,
  isPreview = false,
  isAuthenticated = false,
}: ConfirmationStepProps) {
  const handleDownloadCalendar = () => {
    if (!sessionData.date || !sessionData.startTime || !sessionData.endTime) {
      return;
    }

    const icsContent = generateIcsFile({
      serviceName: sessionData.serviceName ?? 'Appointment',
      date: sessionData.date,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      tenantName,
      timezone,
    });

    const safeName = (sessionData.serviceName ?? 'booking')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    downloadIcsFile(icsContent, `savspot-${safeName}.ics`);
  };

  const total = sessionData.totalAmount ?? sessionData.servicePrice ?? 0;
  const currency = sessionData.serviceCurrency ?? 'USD';

  const hasCalendarData = !!(sessionData.date && sessionData.startTime && sessionData.endTime);

  const googleCalendarUrl = hasCalendarData
    ? buildGoogleCalendarUrl({
        serviceName: sessionData.serviceName ?? 'Appointment',
        date: sessionData.date!,
        startTime: sessionData.startTime!,
        endTime: sessionData.endTime!,
        tenantName,
        tenantAddress,
      })
    : null;

  const mapUrl = tenantAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantAddress)}`
    : null;

  return (
    <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
      {/* Success animation */}
      <div className="mb-6 flex justify-center" aria-hidden="true">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Outer ring animation */}
          <div className="absolute inset-0 animate-[confirm-ring_0.6s_ease-out_forwards] rounded-full border-4 border-green-500 opacity-0" />
          {/* Inner circle */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 animate-[confirm-pop_0.4s_ease-out_0.2s_forwards] scale-0">
            {/* Checkmark */}
            <svg
              className="h-8 w-8 text-white animate-[confirm-check_0.3s_ease-out_0.5s_forwards] opacity-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      </div>

      <h2 className="mb-2 text-2xl font-bold font-heading">
        {isPreview ? 'Preview Complete!' : 'Booking Confirmed!'}
      </h2>

      {isPreview ? (
        <div className="mb-6 space-y-2">
          <div className="rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            This is a preview — no real booking was created. No reservation was
            held and no payment was charged.
          </div>
          <p className="text-muted-foreground">
            This is what your customers will see after completing a booking.
          </p>
        </div>
      ) : (
        <p className="mb-6 text-muted-foreground">
          Your appointment has been booked successfully. You will receive a
          confirmation email shortly.
        </p>
      )}

      {/* Booking summary card */}
      <div className="mb-6 rounded-lg border text-left">
        <div className="space-y-3 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Service</p>
            <p className="font-medium">
              {sessionData.serviceName ?? 'Appointment'}
            </p>
          </div>

          {sessionData.staffName && (
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="font-medium">{sessionData.staffName}</p>
            </div>
          )}

          {sessionData.date && (
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(sessionData.date)}</p>
            </div>
          )}

          {sessionData.startTime && (
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {formatTimeDisplay(sessionData.startTime)}
                {sessionData.endTime &&
                  ` - ${formatTimeDisplay(sessionData.endTime)}`}
              </p>
            </div>
          )}

          {sessionData.guestCount && sessionData.guestCount > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Guests</p>
              <p className="font-medium">
                {sessionData.guestCount}{' '}
                {sessionData.guestCount === 1 ? 'guest' : 'guests'}
              </p>
            </div>
          )}
        </div>

        {total > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">
                {formatPrice(total, currency)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Calendar actions */}
      {hasCalendarData && (
        <div className="mb-4 space-y-2">
          {googleCalendarUrl && (
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Calendar className="h-4 w-4" />
              Add to Google Calendar
            </a>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDownloadCalendar}
          >
            <Download className="mr-2 h-4 w-4" />
            Apple Calendar / Download .ics
          </Button>
        </div>
      )}

      {/* Map link */}
      {mapUrl && (
        <div className="mb-4">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MapPin className="h-4 w-4" />
            View on Map
          </a>
        </div>
      )}

      {/* Post-booking account creation prompt */}
      {!isPreview && !isAuthenticated && sessionData.guestEmail && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-4 text-left">
          <p className="text-sm font-medium">Manage your bookings</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create an account to reschedule, cancel, or view your booking history.
          </p>
          <a
            href={`/register?email=${encodeURIComponent(sessionData.guestEmail)}&name=${encodeURIComponent(sessionData.guestName ?? '')}&returnTo=/portal/bookings`}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </a>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        <Button className="w-full" onClick={onBookAnother}>
          <Calendar className="mr-2 h-4 w-4" />
          Book Another Appointment
        </Button>

        <a
          href={`/book/${tenantSlug}`}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to {tenantName}
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
