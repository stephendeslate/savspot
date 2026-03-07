// ---------------------------------------------------------------------------
// Pure helper functions extracted from the calendar page for testability.
// ---------------------------------------------------------------------------

export interface StatusStyle {
  backgroundColor: string;
  color: string;
  borderColor: string;
  textDecoration?: string;
}

/**
 * Maps a booking status to CSS style properties for calendar event rendering.
 */
export function getStatusStyle(status: string): StatusStyle {
  switch (status) {
    case 'CONFIRMED':
      return { backgroundColor: '#3b82f6', color: '#ffffff', borderColor: '#2563eb' };
    case 'PENDING':
      return { backgroundColor: '#f59e0b', color: '#ffffff', borderColor: '#d97706' };
    case 'COMPLETED':
      return { backgroundColor: '#22c55e', color: '#ffffff', borderColor: '#16a34a' };
    case 'CANCELLED':
      return {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        borderColor: '#dc2626',
        textDecoration: 'line-through',
      };
    case 'NO_SHOW':
      return { backgroundColor: '#6b7280', color: '#ffffff', borderColor: '#4b5563' };
    case 'IN_PROGRESS':
      return { backgroundColor: '#8b5cf6', color: '#ffffff', borderColor: '#7c3aed' };
    default:
      return { backgroundColor: '#3b82f6', color: '#ffffff', borderColor: '#2563eb' };
  }
}

/**
 * Returns a human-readable display name for a booking's client.
 */
export interface CalendarBooking {
  client: { id: string; name: string; email: string } | null;
  source: string;
}

export function getClientDisplayName(booking: CalendarBooking): string {
  if (booking.client) return booking.client.name;
  return booking.source === 'WALK_IN' ? 'Walk-in' : 'Guest';
}

/**
 * Set of booking statuses that allow drag-and-drop rescheduling on the calendar.
 */
export const DRAGGABLE_STATUSES: ReadonlySet<string> = new Set([
  'CONFIRMED',
  'PENDING',
]);
