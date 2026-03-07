import { describe, it, expect } from 'vitest';
import { ROUTES, API_ROUTES, SESSION_COOKIE_NAME } from '../constants';

describe('ROUTES', () => {
  it('should define all auth routes', () => {
    expect(ROUTES.LOGIN).toBe('/login');
    expect(ROUTES.REGISTER).toBe('/register');
    expect(ROUTES.FORGOT_PASSWORD).toBe('/forgot-password');
    expect(ROUTES.RESET_PASSWORD).toBe('/reset-password');
    expect(ROUTES.VERIFY_EMAIL).toBe('/verify-email');
  });

  it('should define all dashboard routes', () => {
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.CALENDAR).toBe('/calendar');
    expect(ROUTES.BOOKINGS).toBe('/bookings');
    expect(ROUTES.SERVICES).toBe('/services');
    expect(ROUTES.CLIENTS).toBe('/clients');
    expect(ROUTES.PAYMENTS).toBe('/payments');
    expect(ROUTES.SETTINGS).toBe('/settings');
  });

  it('should define all settings sub-routes', () => {
    expect(ROUTES.SETTINGS_PROFILE).toBe('/settings/profile');
    expect(ROUTES.SETTINGS_AVAILABILITY).toBe('/settings/availability');
    expect(ROUTES.SETTINGS_PAYMENTS).toBe('/settings/payments');
    expect(ROUTES.SETTINGS_CALENDAR).toBe('/settings/calendar');
    expect(ROUTES.SETTINGS_NOTIFICATIONS).toBe('/settings/notifications');
    expect(ROUTES.SETTINGS_BRANDING).toBe('/settings/branding');
    expect(ROUTES.SETTINGS_DISCOUNTS).toBe('/settings/discounts');
    expect(ROUTES.SETTINGS_TAX_RATES).toBe('/settings/tax-rates');
    expect(ROUTES.SETTINGS_GALLERY).toBe('/settings/gallery');
    expect(ROUTES.SETTINGS_TEAM).toBe('/settings/team');
    expect(ROUTES.SETTINGS_EMBED).toBe('/settings/embed');
  });

  it('should define client portal routes', () => {
    expect(ROUTES.PORTAL).toBe('/portal');
    expect(ROUTES.PORTAL_BOOKINGS).toBe('/portal/bookings');
    expect(ROUTES.PORTAL_PAYMENTS).toBe('/portal/payments');
    expect(ROUTES.PORTAL_PROFILE).toBe('/portal/profile');
    expect(ROUTES.PORTAL_SETTINGS).toBe('/portal/settings');
  });

  it('should have all routes starting with /', () => {
    for (const [, route] of Object.entries(ROUTES)) {
      expect(route).toMatch(/^\//);
    }
  });
});

describe('API_ROUTES', () => {
  it('should define auth endpoints', () => {
    expect(API_ROUTES.LOGIN).toBe('/api/auth/login');
    expect(API_ROUTES.REGISTER).toBe('/api/auth/register');
    expect(API_ROUTES.REFRESH).toBe('/api/auth/refresh');
    expect(API_ROUTES.LOGOUT).toBe('/api/auth/logout');
    expect(API_ROUTES.ME).toBe('/api/users/me');
    expect(API_ROUTES.GOOGLE_AUTH).toBe('/api/auth/google');
  });

  it('should have all API routes starting with /api/', () => {
    for (const [, route] of Object.entries(API_ROUTES)) {
      expect(route).toMatch(/^\/api\//);
    }
  });
});

describe('SESSION_COOKIE_NAME', () => {
  it('should be defined', () => {
    expect(SESSION_COOKIE_NAME).toBe('savspot-has-session');
  });
});
