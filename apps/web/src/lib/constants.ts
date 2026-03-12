export const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // Onboarding
  ONBOARDING: '/onboarding',

  // Dashboard
  DASHBOARD: '/dashboard',
  CALENDAR: '/calendar',
  BOOKINGS: '/bookings',
  SERVICES: '/services',
  SERVICES_NEW: '/services/new',
  CLIENTS: '/clients',
  PAYMENTS: '/payments',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_AVAILABILITY: '/settings/availability',
  SETTINGS_PAYMENTS: '/settings/payments',
  SETTINGS_CALENDAR: '/settings/calendar',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_BRANDING: '/settings/branding',
  SETTINGS_DISCOUNTS: '/settings/discounts',
  SETTINGS_TEAM: '/settings/team',
  SETTINGS_EMBED: '/settings/embed',
  SETTINGS_TAX_RATES: '/settings/tax-rates',
  SETTINGS_GALLERY: '/settings/gallery',
  SETTINGS_BOOKING_FLOW: '/settings/booking-flow',
  SETTINGS_PARTNER_PROGRAM: '/settings/partner-program',

  // Analytics & Management
  ANALYTICS: '/analytics',
  INVOICES: '/invoices',
  REVIEWS: '/reviews',
  QUOTES: '/quotes',
  CONTRACTS: '/contracts',

  // Additional Settings
  SETTINGS_WORKFLOWS: '/settings/workflows',
  SETTINGS_COMMUNICATIONS: '/settings/communications',
  SETTINGS_VENUES: '/settings/venues',
  SETTINGS_REFERRALS: '/settings/referrals',
  SETTINGS_ACCOUNTING: '/settings/accounting',
  SETTINGS_DOMAINS: '/settings/domains',
  SETTINGS_BILLING: '/settings/billing',
  SETTINGS_SERVICE_CATEGORIES: '/settings/service-categories',
  SETTINGS_API_KEYS: '/settings/api-keys',
  SETTINGS_NOTIFICATION_PREFERENCES: '/settings/notification-preferences',
  SETTINGS_VOICE: '/settings/voice',

  // Additional Features
  IMPORTS: '/imports',
  MESSAGES: '/messages',
  INSIGHTS: '/insights',

  // Directory (public)
  DIRECTORY: '/directory',

  // Auth (public)
  ACCEPT_INVITATION: '/accept-invitation',

  // Client Portal
  PORTAL: '/portal',
  PORTAL_BOOKINGS: '/portal/bookings',
  PORTAL_PAYMENTS: '/portal/payments',
  PORTAL_PROFILE: '/portal/profile',
  PORTAL_SETTINGS: '/portal/settings',
} as const;

export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  ME: '/api/users/me',
  GOOGLE_AUTH: '/api/auth/google',
  VERIFY_EMAIL: '/api/auth/verify-email',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',

  // Tenants
  TENANTS: '/api/tenants',

  // Services (template — replace :tenantId at runtime)
  SERVICES: '/api/services',

  // Availability Rules
  AVAILABILITY_RULES: '/api/availability-rules',

  // Clients
  CLIENTS: '/api/clients',

  // Bookings
  BOOKINGS: '/api/bookings',

  // Payments
  PAYMENTS_CONNECT: '/api/payments/connect',
  PAYMENTS_CONNECT_STATUS: '/api/payments/connect/status',
  PAYMENTS_CONNECT_DASHBOARD: '/api/payments/connect/dashboard',

  // Users
  USERS: '/api/users',
} as const;

export const SESSION_COOKIE_NAME = 'savspot_session';
