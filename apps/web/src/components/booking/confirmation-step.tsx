'use client';

import { Calendar, Download, ArrowRight } from 'lucide-react';
import { Button, Separator } from '@savspot/ui';
import type { BookingSessionData } from './booking-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatTimeDisplay(time: string): string {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr ?? '0', 10);
  const minutes = minutesStr ?? '00';
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(
    parseInt(year ?? '2026', 10),
    parseInt(month ?? '1', 10) - 1,
    parseInt(day ?? '1', 10),
  );
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
  onBookAnother: () => void;
  isPreview?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmationStep({
  sessionData,
  tenantName,
  tenantSlug,
  timezone,
  onBookAnother,
  isPreview = false,
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

  return (
    <div className="mx-auto max-w-md text-center">
      {/* Success animation */}
      <div className="mb-6 flex justify-center">
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

      {/* Action buttons */}
      <div className="space-y-3">
        {sessionData.date && sessionData.startTime && sessionData.endTime && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDownloadCalendar}
          >
            <Download className="mr-2 h-4 w-4" />
            Add to Calendar
          </Button>
        )}

        <Button className="w-full" onClick={onBookAnother}>
          <Calendar className="mr-2 h-4 w-4" />
          Book Another Appointment
        </Button>

        <a
          href={`/book/${tenantSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to {tenantName}
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
