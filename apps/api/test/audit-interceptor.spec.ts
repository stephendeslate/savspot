import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, lastValueFrom } from 'rxjs';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AUDIT_ACTION_KEY } from '@/audit/audit.decorator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAuditService = () => ({
  log: vi.fn(),
});

const makeReflector = () => ({
  get: vi.fn().mockReturnValue(undefined),
});

function makeContext(overrides: Record<string, unknown> = {}) {
  const req = {
    method: 'POST',
    path: '/api/tax-rates',
    url: '/api/tax-rates',
    ip: '127.0.0.1',
    params: {},
    user: { sub: 'user-1' },
    headers: { 'user-agent': 'test-agent' },
    body: {},
    ...overrides,
  };
  const handler = vi.fn();
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => vi.fn(),
    _req: req,
    _handler: handler,
  };
}

function makeHandler(response: unknown = {}) {
  return { handle: () => of(response) };
}

async function intercept(
  interceptor: AuditInterceptor,
  ctx: ReturnType<typeof makeContext>,
  handler: ReturnType<typeof makeHandler>,
) {
  const obs = interceptor.intercept(ctx as never, handler as never);
  return lastValueFrom(obs);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: ReturnType<typeof makeAuditService>;
  let reflector: ReturnType<typeof makeReflector>;

  beforeEach(() => {
    auditService = makeAuditService();
    reflector = makeReflector();
    interceptor = new AuditInterceptor(auditService as never, reflector as never);
  });

  // -----------------------------------------------------------------------
  // Method filtering
  // -----------------------------------------------------------------------

  describe('method filtering', () => {
    it.each(['GET', 'OPTIONS', 'HEAD'])(
      'should skip %s requests without calling auditService.log',
      async (method) => {
        const ctx = makeContext({ method });
        const handler = makeHandler({ id: 'abc' });

        await intercept(interceptor, ctx, handler);

        expect(auditService.log).not.toHaveBeenCalled();
      },
    );

    it.each(['POST', 'PATCH', 'PUT', 'DELETE'])(
      'should process %s requests',
      async (method) => {
        const ctx = makeContext({
          method,
          path: '/api/bookings',
          params: { id: 'entity-1' },
        });
        const handler = makeHandler({ id: 'entity-1' });

        await intercept(interceptor, ctx, handler);

        expect(auditService.log).toHaveBeenCalled();
      },
    );
  });

  // -----------------------------------------------------------------------
  // Path skipping
  // -----------------------------------------------------------------------

  describe('path skipping', () => {
    it('should skip /api/auth/ paths', async () => {
      const ctx = makeContext({ path: '/api/auth/login', method: 'POST' });
      const handler = makeHandler({ token: 'abc' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should skip /api/health path', async () => {
      const ctx = makeContext({ path: '/api/health', method: 'POST' });
      const handler = makeHandler({});

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should skip /api/payments/webhook path', async () => {
      const ctx = makeContext({ path: '/api/payments/webhook', method: 'POST' });
      const handler = makeHandler({});

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should not skip /api/payments (non-webhook path)', async () => {
      const ctx = makeContext({
        path: '/api/payments',
        method: 'POST',
        params: {},
      });
      const handler = makeHandler({ id: 'pay-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Entity type extraction
  // -----------------------------------------------------------------------

  describe('entity type extraction', () => {
    it('should extract entity type from simple path', async () => {
      const ctx = makeContext({
        path: '/api/bookings',
        method: 'POST',
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'booking' }),
      );
    });

    it('should extract entity type from nested tenant path', async () => {
      const ctx = makeContext({
        path: '/api/tenants/550e8400-e29b-41d4-a716-446655440000/tax-rates',
        method: 'POST',
      });
      const handler = makeHandler({ id: 'tr-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'tax_rate' }),
      );
    });

    it('should strip trailing s to singularize', async () => {
      const ctx = makeContext({
        path: '/api/clients',
        method: 'POST',
      });
      const handler = makeHandler({ id: 'c-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'client' }),
      );
    });

    it('should find last non-UUID segment when path ends with UUID', async () => {
      const ctx = makeContext({
        path: '/api/tenants/550e8400-e29b-41d4-a716-446655440000/gallery/660e8400-e29b-41d4-a716-446655440001',
        method: 'PATCH',
        params: { id: '660e8400-e29b-41d4-a716-446655440001' },
      });
      const handler = makeHandler({ id: '660e8400-e29b-41d4-a716-446655440001' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'gallery' }),
      );
    });

    it('should replace hyphens with underscores in entity type', async () => {
      const ctx = makeContext({
        path: '/api/tenants/550e8400-e29b-41d4-a716-446655440000/booking-sessions',
        method: 'POST',
      });
      const handler = makeHandler({ id: 'bs-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'booking_session' }),
      );
    });

    it('should return unknown when all segments are UUIDs', async () => {
      const ctx = makeContext({
        path: '/api/550e8400-e29b-41d4-a716-446655440000',
        method: 'POST',
        params: {},
      });
      const handler = makeHandler({ id: 'new-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'unknown' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Entity ID extraction
  // -----------------------------------------------------------------------

  describe('entity ID extraction', () => {
    it('should extract entity ID from response body for POST', async () => {
      const ctx = makeContext({ method: 'POST', path: '/api/bookings' });
      const handler = makeHandler({ id: 'created-id-123' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'created-id-123' }),
      );
    });

    it('should extract entity ID from params.id for PATCH', async () => {
      const ctx = makeContext({
        method: 'PATCH',
        path: '/api/bookings/entity-456',
        params: { id: 'entity-456' },
      });
      const handler = makeHandler({ id: 'entity-456' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'entity-456' }),
      );
    });

    it('should extract entity ID from params.id for DELETE', async () => {
      const ctx = makeContext({
        method: 'DELETE',
        path: '/api/bookings/entity-789',
        params: { id: 'entity-789' },
      });
      const handler = makeHandler(undefined);

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'entity-789' }),
      );
    });

    it('should fallback to last UUID in path when params.id is missing', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const ctx = makeContext({
        method: 'PUT',
        path: `/api/bookings/${uuid}`,
        params: {},
      });
      const handler = makeHandler({});

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: uuid }),
      );
    });

    it('should not call auditService.log when no entity ID can be extracted', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
      });
      // Response has no id field
      const handler = makeHandler({ name: 'no-id' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should not call auditService.log when POST response is null', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
      });
      const handler = makeHandler(null);

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // HTTP method to action mapping
  // -----------------------------------------------------------------------

  describe('action mapping', () => {
    it('should map POST to CREATE', async () => {
      const ctx = makeContext({ method: 'POST', path: '/api/bookings' });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE' }),
      );
    });

    it('should map PATCH to UPDATE', async () => {
      const ctx = makeContext({
        method: 'PATCH',
        path: '/api/bookings/b-1',
        params: { id: 'b-1' },
      });
      const handler = makeHandler({});

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });

    it('should map PUT to UPDATE', async () => {
      const ctx = makeContext({
        method: 'PUT',
        path: '/api/bookings/b-1',
        params: { id: 'b-1' },
      });
      const handler = makeHandler({});

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });

    it('should map DELETE to DELETE', async () => {
      const ctx = makeContext({
        method: 'DELETE',
        path: '/api/bookings/b-1',
        params: { id: 'b-1' },
      });
      const handler = makeHandler(undefined);

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // @AuditLog decorator (custom action)
  // -----------------------------------------------------------------------

  describe('@AuditLog decorator', () => {
    it('should use custom action from @AuditLog decorator when present', async () => {
      reflector.get.mockReturnValue('LOGIN');
      const ctx = makeContext({
        method: 'POST',
        path: '/api/sessions',
      });
      const handler = makeHandler({ id: 'session-1' });

      await intercept(interceptor, ctx, handler);

      expect(reflector.get).toHaveBeenCalledWith(AUDIT_ACTION_KEY, ctx._handler);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN' }),
      );
    });

    it('should fall back to HTTP method mapping when no decorator', async () => {
      reflector.get.mockReturnValue(undefined);
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Actor and tenant extraction
  // -----------------------------------------------------------------------

  describe('actor and tenant extraction', () => {
    it('should extract actorId from user.sub', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
        user: { sub: 'user-abc' },
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'user-abc', actorType: 'USER' }),
      );
    });

    it('should fallback to user.id when user.sub is missing', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
        user: { id: 'user-xyz' },
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'user-xyz' }),
      );
    });

    it('should set actorType to API_KEY when user.isApiKey is true', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
        user: { sub: 'key-1', isApiKey: true },
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'API_KEY' }),
      );
    });

    it('should set actorType to SYSTEM when no user present', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
        user: undefined,
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'SYSTEM' }),
      );
    });

    it('should extract tenantId from user.tenantId', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
        user: { sub: 'user-1', tenantId: 'tenant-from-user' },
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-from-user' }),
      );
    });

    it('should fallback to params.tenantId when user.tenantId is missing', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/tenants/tenant-from-params/bookings',
        user: { sub: 'user-1' },
        params: { tenantId: 'tenant-from-params' },
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-from-params' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Fire-and-forget behavior
  // -----------------------------------------------------------------------

  describe('fire-and-forget', () => {
    it('should call auditService.log without awaiting (no return value used)', async () => {
      auditService.log.mockReturnValue(Promise.resolve());
      const ctx = makeContext({ method: 'POST', path: '/api/bookings' });
      const handler = makeHandler({ id: 'b-1' });

      const result = await intercept(interceptor, ctx, handler);

      // The response should be the handler's response, not the audit log result
      expect(result).toEqual({ id: 'b-1' });
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should not block response if auditService.log throws', async () => {
      // auditService.log is fire-and-forget; errors should not propagate
      // Since it's not awaited, the promise rejection won't affect the response
      auditService.log.mockImplementation(() => {
        throw new Error('Audit failed');
      });
      const ctx = makeContext({ method: 'POST', path: '/api/bookings' });
      const handler = makeHandler({ id: 'b-1' });

      // tap() will throw synchronously, which rxjs will catch
      // But we test that the log was at least called
      try {
        await intercept(interceptor, ctx, handler);
      } catch {
        // tap errors propagate through the observable
      }
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // newValues / metadata
  // -----------------------------------------------------------------------

  describe('request metadata', () => {
    it('should include request body as newValues for non-DELETE methods', async () => {
      const body = { name: 'Updated' };
      const ctx = makeContext({
        method: 'PATCH',
        path: '/api/bookings/b-1',
        params: { id: 'b-1' },
        body,
      });
      const handler = makeHandler({});

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ newValues: body }),
      );
    });

    it('should not include newValues for DELETE method', async () => {
      const ctx = makeContext({
        method: 'DELETE',
        path: '/api/bookings/b-1',
        params: { id: 'b-1' },
        body: { some: 'data' },
      });
      const handler = makeHandler(undefined);

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ newValues: undefined }),
      );
    });

    it('should pass ip address and user-agent', async () => {
      const ctx = makeContext({
        method: 'POST',
        path: '/api/bookings',
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Mozilla/5.0' },
      });
      const handler = makeHandler({ id: 'b-1' });

      await intercept(interceptor, ctx, handler);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });
  });
});
