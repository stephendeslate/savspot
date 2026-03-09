import { SetMetadata } from '@nestjs/common';

export const API_KEY_SCOPES_KEY = 'apiKeyScopes';

/**
 * Decorator to restrict API key access to specific scopes.
 * Endpoints without this decorator are accessible by any valid API key.
 * JWT-authenticated users are not affected by this decorator.
 *
 * Usage: @RequiredApiKeyScopes('bookings:read', 'bookings:write')
 */
export const RequiredApiKeyScopes = (...scopes: string[]) =>
  SetMetadata(API_KEY_SCOPES_KEY, scopes);
