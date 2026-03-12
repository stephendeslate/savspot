import { describe, it, expect } from 'vitest';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
  QUEUE_IMPORTS,
  QUEUE_CURRENCY_REFRESH,
  QUEUE_WEBHOOKS,
  QUEUE_VOICE_CALLS,
  QUEUE_ACCOUNTING,
  ALL_QUEUES,
  QUEUE_CONCURRENCY,
  JOB_EXPIRE_RESERVATIONS,
  JOB_SEND_PAYMENT_REMINDERS,
  JOB_DELIVER_COMMUNICATION,
  JOB_GENERATE_INVOICE_PDF,
  JOB_CLEANUP_RETENTION,
  CRON_EVERY_5_MIN,
  CRON_DAILY_3AM_UTC,
  CRON_MONDAY_8AM_UTC,
} from '@/bullmq/queue.constants';

describe('queue.constants', () => {
  // ---------- Queue names ----------
  describe('queue name constants', () => {
    it('should define all expected queue names', () => {
      expect(QUEUE_BOOKINGS).toBe('bookings');
      expect(QUEUE_PAYMENTS).toBe('payments');
      expect(QUEUE_CALENDAR).toBe('calendar');
      expect(QUEUE_COMMUNICATIONS).toBe('communications');
      expect(QUEUE_INVOICES).toBe('invoices');
      expect(QUEUE_GDPR).toBe('gdpr');
      expect(QUEUE_IMPORTS).toBe('imports');
      expect(QUEUE_CURRENCY_REFRESH).toBe('currency-refresh');
      expect(QUEUE_WEBHOOKS).toBe('webhooks');
      expect(QUEUE_VOICE_CALLS).toBe('voice-calls');
      expect(QUEUE_ACCOUNTING).toBe('accounting');
    });
  });

  // ---------- ALL_QUEUES ----------
  describe('ALL_QUEUES', () => {
    it('should contain exactly 16 queues', () => {
      expect(ALL_QUEUES).toHaveLength(16);
    });

    it('should include every individual queue constant', () => {
      expect(ALL_QUEUES).toContain(QUEUE_BOOKINGS);
      expect(ALL_QUEUES).toContain(QUEUE_PAYMENTS);
      expect(ALL_QUEUES).toContain(QUEUE_CALENDAR);
      expect(ALL_QUEUES).toContain(QUEUE_COMMUNICATIONS);
      expect(ALL_QUEUES).toContain(QUEUE_INVOICES);
      expect(ALL_QUEUES).toContain(QUEUE_GDPR);
      expect(ALL_QUEUES).toContain(QUEUE_IMPORTS);
      expect(ALL_QUEUES).toContain(QUEUE_CURRENCY_REFRESH);
      expect(ALL_QUEUES).toContain(QUEUE_WEBHOOKS);
      expect(ALL_QUEUES).toContain(QUEUE_VOICE_CALLS);
      expect(ALL_QUEUES).toContain(QUEUE_ACCOUNTING);
    });

    it('should be a readonly tuple (no duplicate entries)', () => {
      const unique = new Set(ALL_QUEUES);
      expect(unique.size).toBe(ALL_QUEUES.length);
    });
  });

  // ---------- QUEUE_CONCURRENCY ----------
  describe('QUEUE_CONCURRENCY', () => {
    it('should have a concurrency value for every queue in ALL_QUEUES', () => {
      for (const queue of ALL_QUEUES) {
        expect(QUEUE_CONCURRENCY[queue]).toBeDefined();
        expect(typeof QUEUE_CONCURRENCY[queue]).toBe('number');
        expect(QUEUE_CONCURRENCY[queue]).toBeGreaterThan(0);
      }
    });

    it('should set communications to the highest concurrency (10)', () => {
      expect(QUEUE_CONCURRENCY[QUEUE_COMMUNICATIONS]).toBe(10);
    });

    it('should set currency-refresh to the lowest concurrency (1)', () => {
      expect(QUEUE_CONCURRENCY[QUEUE_CURRENCY_REFRESH]).toBe(1);
    });

    it('should set bookings and payments to 5', () => {
      expect(QUEUE_CONCURRENCY[QUEUE_BOOKINGS]).toBe(5);
      expect(QUEUE_CONCURRENCY[QUEUE_PAYMENTS]).toBe(5);
    });
  });

  // ---------- Job names ----------
  describe('job name constants', () => {
    it('should define booking job names', () => {
      expect(JOB_EXPIRE_RESERVATIONS).toBe('expireReservations');
    });

    it('should define payment job names', () => {
      expect(JOB_SEND_PAYMENT_REMINDERS).toBe('sendPaymentReminders');
    });

    it('should define communication job names', () => {
      expect(JOB_DELIVER_COMMUNICATION).toBe('deliverCommunication');
    });

    it('should define invoice job names', () => {
      expect(JOB_GENERATE_INVOICE_PDF).toBe('generateInvoicePdf');
    });

    it('should define GDPR job names', () => {
      expect(JOB_CLEANUP_RETENTION).toBe('cleanupRetentionPolicy');
    });
  });

  // ---------- Cron schedules ----------
  describe('cron schedule constants', () => {
    it('should define valid cron patterns', () => {
      expect(CRON_EVERY_5_MIN).toBe('*/5 * * * *');
      expect(CRON_DAILY_3AM_UTC).toBe('0 3 * * *');
      expect(CRON_MONDAY_8AM_UTC).toBe('0 8 * * 1');
    });
  });
});
