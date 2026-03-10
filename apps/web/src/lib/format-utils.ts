/**
 * Shared formatting and color utilities used across dashboard and portal pages.
 */

/**
 * Returns Tailwind classes for a booking status badge.
 * Covers booking statuses and common payment statuses (SUCCEEDED, FAILED, REFUNDED).
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'NO_SHOW':
      return 'bg-gray-100 text-gray-800';
    case 'SUCCEEDED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Returns Tailwind classes for a booking source badge.
 */
export function getSourceColor(source: string): string {
  switch (source) {
    case 'WALK_IN':
      return 'bg-orange-100 text-orange-800';
    case 'DIRECT':
      return 'bg-blue-100 text-blue-800';
    case 'REFERRAL':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
      return 'bg-green-100 text-green-800';
    case 'SENT':
    case 'PENDING':
      return 'bg-blue-100 text-blue-800';
    case 'PROCESSING':
      return 'bg-yellow-100 text-yellow-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
      return 'bg-green-100 text-green-800';
    case 'SENT':
    case 'PENDING':
      return 'bg-blue-100 text-blue-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'REFUNDED':
      return 'bg-orange-100 text-orange-800';
    case 'VOID':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Formats a monetary amount with the given currency code.
 */
export function formatAmount(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

/**
 * Converts an UPPER_SNAKE_CASE status to Title Case with spaces.
 */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
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
