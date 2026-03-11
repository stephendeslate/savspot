export interface TemplateVariable {
  name: string;
  description: string;
  group: string;
}

export const TEMPLATE_VARIABLE_REGISTRY: TemplateVariable[] = [
  // Business
  { name: 'business.name', description: 'Business display name', group: 'business' },
  { name: 'business.email', description: 'Business contact email', group: 'business' },
  { name: 'business.phone', description: 'Business phone number', group: 'business' },
  { name: 'business.address', description: 'Business address', group: 'business' },
  { name: 'business.logoUrl', description: 'Business logo URL', group: 'business' },
  { name: 'business.brandColor', description: 'Brand primary color', group: 'business' },

  // Booking
  { name: 'booking.id', description: 'Booking unique ID', group: 'booking' },
  { name: 'booking.status', description: 'Booking status', group: 'booking' },
  { name: 'booking.startTime', description: 'Booking start time', group: 'booking' },
  { name: 'booking.endTime', description: 'Booking end time', group: 'booking' },
  { name: 'booking.date', description: 'Booking date (formatted)', group: 'booking' },
  { name: 'booking.notes', description: 'Booking notes', group: 'booking' },

  // Client
  { name: 'client.name', description: 'Client full name', group: 'client' },
  { name: 'client.email', description: 'Client email address', group: 'client' },
  { name: 'client.phone', description: 'Client phone number', group: 'client' },
  { name: 'client.firstName', description: 'Client first name', group: 'client' },

  // Service
  { name: 'service.name', description: 'Service name', group: 'service' },
  { name: 'service.price', description: 'Service price', group: 'service' },
  { name: 'service.duration', description: 'Service duration in minutes', group: 'service' },
  { name: 'service.description', description: 'Service description', group: 'service' },

  // Payment
  { name: 'payment.amount', description: 'Payment amount', group: 'payment' },
  { name: 'payment.currency', description: 'Payment currency code', group: 'payment' },
  { name: 'payment.status', description: 'Payment status', group: 'payment' },
  { name: 'payment.method', description: 'Payment method', group: 'payment' },

  // Invoice
  { name: 'invoice.number', description: 'Invoice number', group: 'invoice' },
  { name: 'invoice.total', description: 'Invoice total amount', group: 'invoice' },
  { name: 'invoice.dueDate', description: 'Invoice due date', group: 'invoice' },
  { name: 'invoice.status', description: 'Invoice status', group: 'invoice' },

  // Calendar
  { name: 'calendar.eventTitle', description: 'Calendar event title', group: 'calendar' },
  { name: 'calendar.eventDate', description: 'Calendar event date', group: 'calendar' },

  // Provider
  { name: 'provider.name', description: 'Service provider name', group: 'provider' },
  { name: 'provider.email', description: 'Service provider email', group: 'provider' },

  // Portal
  { name: 'portal.url', description: 'Client portal URL', group: 'portal' },
  { name: 'portal.bookingUrl', description: 'Booking detail URL in portal', group: 'portal' },

  // Review
  { name: 'review.url', description: 'Review submission URL', group: 'review' },

  // Contract
  { name: 'contract.title', description: 'Contract title', group: 'contract' },
  { name: 'contract.url', description: 'Contract signing URL', group: 'contract' },

  // Quote
  { name: 'quote.number', description: 'Quote number', group: 'quote' },
  { name: 'quote.total', description: 'Quote total amount', group: 'quote' },
  { name: 'quote.expiresAt', description: 'Quote expiry date', group: 'quote' },

  // System
  { name: 'system.appName', description: 'Application name (SavSpot)', group: 'system' },
  { name: 'system.currentYear', description: 'Current year', group: 'system' },
  { name: 'system.supportEmail', description: 'Support email address', group: 'system' },
];

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
  options?: { escapeHtml?: boolean },
): string {
  const shouldEscape = options?.escapeHtml !== false;

  return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_match, key: string) => {
    const trimmedKey = key.trim();
    const value = getNestedValue(context, trimmedKey);

    if (value == null) {
      return '';
    }

    const strValue = String(value);
    return shouldEscape ? escapeHtml(strValue) : strValue;
  });
}
