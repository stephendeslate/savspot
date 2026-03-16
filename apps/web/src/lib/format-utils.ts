/**
 * Shared formatting and color utilities used across dashboard and portal pages.
 */

/**
 * Returns Tailwind classes for a booking status badge.
 * Covers booking statuses and common payment statuses (SUCCEEDED, FAILED, REFUNDED).
 * Uses semantic status tokens defined in globals.css.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-status-pending text-status-pending-foreground';
    case 'CONFIRMED':
      return 'bg-status-confirmed text-status-confirmed-foreground';
    case 'IN_PROGRESS':
      return 'bg-status-confirmed text-status-confirmed-foreground';
    case 'COMPLETED':
      return 'bg-status-completed text-status-completed-foreground';
    case 'CANCELLED':
      return 'bg-status-cancelled text-status-cancelled-foreground';
    case 'NO_SHOW':
      return 'bg-status-neutral text-status-neutral-foreground';
    case 'SUCCEEDED':
      return 'bg-status-completed text-status-completed-foreground';
    case 'FAILED':
      return 'bg-status-error text-status-error-foreground';
    case 'REFUNDED':
      return 'bg-status-neutral text-status-neutral-foreground';
    default:
      return 'bg-status-neutral text-status-neutral-foreground';
  }
}

/**
 * Returns Tailwind classes for a booking source badge.
 */
export function getSourceColor(source: string): string {
  switch (source) {
    case 'WALK_IN':
      return 'bg-status-pending text-status-pending-foreground';
    case 'DIRECT':
      return 'bg-status-confirmed text-status-confirmed-foreground';
    case 'REFERRAL':
      return 'bg-status-completed text-status-completed-foreground';
    default:
      return 'bg-status-neutral text-status-neutral-foreground';
  }
}

/**
 * Returns Tailwind classes for a payment status badge.
 */
export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
    case 'SUCCEEDED':
    case 'COMPLETED':
      return 'bg-status-completed text-status-completed-foreground';
    case 'SENT':
    case 'PENDING':
      return 'bg-status-confirmed text-status-confirmed-foreground';
    case 'PROCESSING':
      return 'bg-status-pending text-status-pending-foreground';
    case 'OVERDUE':
      return 'bg-status-error text-status-error-foreground';
    case 'FAILED':
      return 'bg-status-error text-status-error-foreground';
    case 'REFUNDED':
      return 'bg-status-pending text-status-pending-foreground';
    default:
      return 'bg-status-neutral text-status-neutral-foreground';
  }
}

/**
 * Returns Tailwind classes for an invoice status badge.
 */
export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
    case 'SUCCEEDED':
    case 'COMPLETED':
      return 'bg-status-completed text-status-completed-foreground';
    case 'SENT':
    case 'PENDING':
      return 'bg-status-confirmed text-status-confirmed-foreground';
    case 'OVERDUE':
      return 'bg-status-error text-status-error-foreground';
    case 'DRAFT':
      return 'bg-status-neutral text-status-neutral-foreground';
    case 'REFUNDED':
      return 'bg-status-pending text-status-pending-foreground';
    case 'VOID':
      return 'bg-status-cancelled text-status-cancelled-foreground';
    default:
      return 'bg-status-neutral text-status-neutral-foreground';
  }
}

/**
 * Formats a monetary amount with the given currency code.
 */
export function formatAmount(
  amount: string,
  currency: string,
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

/**
 * Converts an UPPER_SNAKE_CASE status to Title Case with spaces.
 */
export function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns a human-readable label for a payment type.
 */
export function formatPaymentType(type: string): string {
  switch (type) {
    case 'DEPOSIT':
      return 'Deposit';
    case 'FULL':
      return 'Full';
    case 'REFUND':
      return 'Refund';
    case 'PARTIAL':
      return 'Partial';
    default:
      return formatStatus(type);
  }
}
