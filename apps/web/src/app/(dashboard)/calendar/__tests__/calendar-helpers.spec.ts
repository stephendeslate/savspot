import { describe, it, expect } from 'vitest';
import {
  getStatusStyle,
  getClientDisplayName,
  DRAGGABLE_STATUSES,
  type CalendarBooking,
} from '../calendar-helpers';

// ---------------------------------------------------------------------------
// getStatusStyle
// ---------------------------------------------------------------------------

describe('getStatusStyle', () => {
  it('should return blue for CONFIRMED', () => {
    const style = getStatusStyle('CONFIRMED');
    expect(style.backgroundColor).toBe('#3b82f6');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#2563eb');
  });

  it('should return amber for PENDING', () => {
    const style = getStatusStyle('PENDING');
    expect(style.backgroundColor).toBe('#f59e0b');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#d97706');
  });

  it('should return green for COMPLETED', () => {
    const style = getStatusStyle('COMPLETED');
    expect(style.backgroundColor).toBe('#22c55e');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#16a34a');
  });

  it('should return red with line-through for CANCELLED', () => {
    const style = getStatusStyle('CANCELLED');
    expect(style.backgroundColor).toBe('#ef4444');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#dc2626');
    expect(style.textDecoration).toBe('line-through');
  });

  it('should return gray for NO_SHOW', () => {
    const style = getStatusStyle('NO_SHOW');
    expect(style.backgroundColor).toBe('#6b7280');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#4b5563');
  });

  it('should return purple for IN_PROGRESS', () => {
    const style = getStatusStyle('IN_PROGRESS');
    expect(style.backgroundColor).toBe('#8b5cf6');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#7c3aed');
  });

  it('should return default blue style for RESCHEDULED (unknown status)', () => {
    const style = getStatusStyle('RESCHEDULED');
    expect(style.backgroundColor).toBe('#3b82f6');
    expect(style.color).toBe('#ffffff');
    expect(style.borderColor).toBe('#2563eb');
  });

  it('should return default blue style for unknown status', () => {
    const style = getStatusStyle('SOMETHING_ELSE');
    expect(style.backgroundColor).toBe('#3b82f6');
  });

  it('should not include textDecoration for non-CANCELLED statuses', () => {
    for (const status of ['CONFIRMED', 'PENDING', 'COMPLETED', 'NO_SHOW', 'IN_PROGRESS']) {
      const style = getStatusStyle(status);
      expect(style.textDecoration).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// getClientDisplayName
// ---------------------------------------------------------------------------

describe('getClientDisplayName', () => {
  it('should return client name when client is present', () => {
    const booking: CalendarBooking = {
      client: { id: 'c1', name: 'Jane Doe', email: 'jane@example.com' },
      source: 'DIRECT',
    };
    expect(getClientDisplayName(booking)).toBe('Jane Doe');
  });

  it('should return "Walk-in" for walk-in bookings without a client', () => {
    const booking: CalendarBooking = {
      client: null,
      source: 'WALK_IN',
    };
    expect(getClientDisplayName(booking)).toBe('Walk-in');
  });

  it('should return "Guest" for non-walk-in bookings without a client', () => {
    const booking: CalendarBooking = {
      client: null,
      source: 'DIRECT',
    };
    expect(getClientDisplayName(booking)).toBe('Guest');
  });

  it('should return "Guest" for ONLINE source without a client', () => {
    const booking: CalendarBooking = {
      client: null,
      source: 'ONLINE',
    };
    expect(getClientDisplayName(booking)).toBe('Guest');
  });

  it('should prefer client name over source label', () => {
    const booking: CalendarBooking = {
      client: { id: 'c1', name: 'John Smith', email: 'john@example.com' },
      source: 'WALK_IN',
    };
    expect(getClientDisplayName(booking)).toBe('John Smith');
  });
});

// ---------------------------------------------------------------------------
// DRAGGABLE_STATUSES
// ---------------------------------------------------------------------------

describe('DRAGGABLE_STATUSES', () => {
  it('should contain CONFIRMED', () => {
    expect(DRAGGABLE_STATUSES.has('CONFIRMED')).toBe(true);
  });

  it('should contain PENDING', () => {
    expect(DRAGGABLE_STATUSES.has('PENDING')).toBe(true);
  });

  it('should not contain CANCELLED', () => {
    expect(DRAGGABLE_STATUSES.has('CANCELLED')).toBe(false);
  });

  it('should not contain COMPLETED', () => {
    expect(DRAGGABLE_STATUSES.has('COMPLETED')).toBe(false);
  });

  it('should not contain NO_SHOW', () => {
    expect(DRAGGABLE_STATUSES.has('NO_SHOW')).toBe(false);
  });

  it('should not contain IN_PROGRESS', () => {
    expect(DRAGGABLE_STATUSES.has('IN_PROGRESS')).toBe(false);
  });

  it('should have exactly 2 entries', () => {
    expect(DRAGGABLE_STATUSES.size).toBe(2);
  });
});
