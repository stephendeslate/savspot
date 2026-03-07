import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from '@/common/guards/csrf.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReflector() {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(false),
  };
}

function makeConfigService() {
  return {
    get: vi.fn((key: string, defaultVal: string) => {
      if (key === 'WEB_URL') return 'http://localhost:3000';
      if (key === 'PORT') return '3001';
      return defaultVal;
    }),
  };
}

function makeContext(
  method: string,
  path: string,
  headers: Record<string, string | undefined> = {},
  params: Record<string, string> = {},
) {
  const request = {
    method,
    path,
    headers,
    params,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: ReturnType<typeof makeReflector>;
  let configService: ReturnType<typeof makeConfigService>;

  beforeEach(() => {
    reflector = makeReflector();
    configService = makeConfigService();
    guard = new CsrfGuard(reflector as never, configService as never);
  });

  // -----------------------------------------------------------------------
  // Safe methods
  // -----------------------------------------------------------------------

  it('should allow GET requests without origin check', () => {
    const result = guard.canActivate(makeContext('GET', '/api/bookings'));

    expect(result).toBe(true);
  });

  it('should allow HEAD requests', () => {
    const result = guard.canActivate(makeContext('HEAD', '/api/bookings'));

    expect(result).toBe(true);
  });

  it('should allow OPTIONS requests', () => {
    const result = guard.canActivate(makeContext('OPTIONS', '/api/bookings'));

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Public routes
  // -----------------------------------------------------------------------

  it('should allow @Public() routes for state-changing methods', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(
      makeContext('POST', '/api/webhooks/stripe', {}),
    );

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // API key
  // -----------------------------------------------------------------------

  it('should allow requests with X-API-Key header', () => {
    const result = guard.canActivate(
      makeContext('POST', '/api/bookings', { 'x-api-key': 'sk_test_123' }),
    );

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Exempt paths
  // -----------------------------------------------------------------------

  it('should allow webhook paths without origin check', () => {
    const result = guard.canActivate(
      makeContext('POST', '/api/payments/webhook'),
    );

    expect(result).toBe(true);
  });

  it('should allow connect webhook path', () => {
    const result = guard.canActivate(
      makeContext('POST', '/api/payments/connect-webhook'),
    );

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Origin validation
  // -----------------------------------------------------------------------

  it('should allow POST from allowed origin', () => {
    const result = guard.canActivate(
      makeContext('POST', '/api/bookings', {
        origin: 'http://localhost:3000',
      }),
    );

    expect(result).toBe(true);
  });

  it('should reject POST from disallowed origin', () => {
    expect(() =>
      guard.canActivate(
        makeContext('POST', '/api/bookings', {
          origin: 'https://evil.com',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  // -----------------------------------------------------------------------
  // Referer validation
  // -----------------------------------------------------------------------

  it('should allow POST with valid referer when no origin header', () => {
    const result = guard.canActivate(
      makeContext('POST', '/api/bookings', {
        referer: 'http://localhost:3000/dashboard',
      }),
    );

    expect(result).toBe(true);
  });

  it('should reject POST with invalid referer', () => {
    expect(() =>
      guard.canActivate(
        makeContext('POST', '/api/bookings', {
          referer: 'https://evil.com/page',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  // -----------------------------------------------------------------------
  // No origin/referer
  // -----------------------------------------------------------------------

  it('should allow POST with no origin or referer (same-origin browser behavior)', () => {
    const result = guard.canActivate(
      makeContext('POST', '/api/bookings', {}),
    );

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Other state-changing methods
  // -----------------------------------------------------------------------

  it('should validate PATCH requests', () => {
    const result = guard.canActivate(
      makeContext('PATCH', '/api/bookings/123', {
        origin: 'http://localhost:3000',
      }),
    );

    expect(result).toBe(true);
  });

  it('should validate DELETE requests', () => {
    expect(() =>
      guard.canActivate(
        makeContext('DELETE', '/api/bookings/123', {
          origin: 'https://attacker.com',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
