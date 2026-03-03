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
  SERVICES: '/services',
  SERVICES_NEW: '/services/new',
  CLIENTS: '/clients',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_AVAILABILITY: '/settings/availability',
} as const;

export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
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

  // Users
  USERS: '/api/users',
} as const;

export const SESSION_COOKIE_NAME = 'savspot-has-session';
