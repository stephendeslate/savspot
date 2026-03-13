export const queryKeys = {
  services: (tenantId: string) => ['services', tenantId] as const,
  bookings: (tenantId: string, params?: Record<string, string>) =>
    ['bookings', tenantId, params] as const,
  clients: (tenantId: string, params?: Record<string, string>) =>
    ['clients', tenantId, params] as const,
  dashboardStats: (tenantId: string) => ['dashboard-stats', tenantId] as const,
  notifications: (tenantId: string) => ['notifications', tenantId] as const,
  unreadCount: (tenantId: string) => ['unread-count', tenantId] as const,
  calendarEvents: (tenantId: string, start: string, end: string) =>
    ['calendar-events', tenantId, start, end] as const,
  availabilityRules: (tenantId: string) =>
    ['availability-rules', tenantId] as const,
  stripeStatus: (tenantId: string) => ['stripe-status', tenantId] as const,
  calendarConnections: (tenantId: string) =>
    ['calendar-connections', tenantId] as const,
  payments: (tenantId: string, params?: Record<string, string>) =>
    ['payments', tenantId, params] as const,
  paymentStats: (tenantId: string) => ['payment-stats', tenantId] as const,
};
