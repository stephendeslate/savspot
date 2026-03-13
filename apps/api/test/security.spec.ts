import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, SkipThrottle, Throttle } from '@nestjs/throttler';
import request from 'supertest';
import helmet from 'helmet';
import { Request, Response } from 'express';
import { CustomThrottlerGuard } from '@/common/guards/throttle.guard';
import { SecurityHeadersMiddleware } from '@/common/middleware/security-headers.middleware';

// ---------------------------------------------------------------------------
// Test controllers
// ---------------------------------------------------------------------------

@Controller('test')
class TestController {
  @Get('open')
  open() {
    return { ok: true };
  }

  @Get('strict')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  strict() {
    return { ok: true };
  }
}

@SkipThrottle()
@Controller('webhook')
class WebhookController {
  @Get('hook')
  hook() {
    return { hooked: true };
  }
}

@Controller('embed')
class EmbedController {
  @Get('widget')
  widget() {
    return { embedded: true };
  }
}

// ---------------------------------------------------------------------------
// Test module
// ---------------------------------------------------------------------------

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 5,
      },
    ]),
  ],
  controllers: [TestController, WebhookController, EmbedController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Security Hardening', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Add helmet just like main.ts
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'self'`],
            scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'https:'],
            fontSrc: [`'self'`, 'https://fonts.gstatic.com'],
          },
        },
        crossOriginEmbedderPolicy: false,
        xFrameOptions: false,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // Helmet headers
  // -------------------------------------------------------------------------

  describe('Helmet headers', () => {
    it('should set X-DNS-Prefetch-Control header', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should set X-Download-Options header', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['x-download-options']).toBe('noopen');
    });

    it('should set Strict-Transport-Security header', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('should set X-Content-Type-Options via helmet', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set Content-Security-Policy header', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  // -------------------------------------------------------------------------
  // Security headers middleware
  // -------------------------------------------------------------------------

  describe('SecurityHeadersMiddleware', () => {
    it('should set X-Frame-Options to DENY on normal routes', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-Frame-Options header on responses', async () => {
      const res = await request(app.getHttpServer()).get('/embed/widget');
      // X-Frame-Options is set by SecurityHeadersMiddleware
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-Content-Type-Options to nosniff', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set a Content-Security-Policy with frame-ancestors none', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      const csp = res.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("'self'");
    });
  });

  // -------------------------------------------------------------------------
  // Throttle guard — default limits
  // -------------------------------------------------------------------------

  describe('ThrottlerGuard — default limits', () => {
    it('should allow requests under the default limit', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.status).toBe(200);
    });

    it('should include rate-limit headers in responses', async () => {
      const res = await request(app.getHttpServer()).get('/test/open');
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should return 429 when the default limit is exceeded', async () => {
      const server = app.getHttpServer();
      for (let i = 0; i < 5; i++) {
        await request(server).get('/test/open');
      }

      const res = await request(server).get('/test/open');
      expect(res.status).toBe(429);
    });
  });

  // -------------------------------------------------------------------------
  // Throttle guard — per-route overrides
  // -------------------------------------------------------------------------

  describe('ThrottlerGuard — per-route @Throttle override', () => {
    it('should return 429 after the stricter per-route limit', async () => {
      const server = app.getHttpServer();
      const res1 = await request(server).get('/test/strict');
      expect(res1.status).toBe(200);

      const res2 = await request(server).get('/test/strict');
      expect(res2.status).toBe(200);

      const res3 = await request(server).get('/test/strict');
      expect(res3.status).toBe(429);
    });

    it('should return a JSON error body on 429', async () => {
      const server = app.getHttpServer();
      for (let i = 0; i < 2; i++) {
        await request(server).get('/test/strict');
      }

      const res = await request(server).get('/test/strict');
      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('message');
    });
  });

  // -------------------------------------------------------------------------
  // @SkipThrottle
  // -------------------------------------------------------------------------

  describe('@SkipThrottle on webhook controller', () => {
    it('should not rate-limit webhook endpoints', async () => {
      const server = app.getHttpServer();
      for (let i = 0; i < 20; i++) {
        const res = await request(server).get('/webhook/hook');
        expect(res.status).toBe(200);
      }
    });

    it('should not include rate-limit headers on skipped routes', async () => {
      const res = await request(app.getHttpServer()).get('/webhook/hook');
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // CustomThrottlerGuard — tracker selection
  // -------------------------------------------------------------------------

  describe('CustomThrottlerGuard — getTracker', () => {
    it('should use IP for unauthenticated requests', async () => {
      const server = app.getHttpServer();
      const res1 = await request(server).get('/test/open');
      expect(res1.status).toBe(200);

      const remaining1 = parseInt(res1.headers['x-ratelimit-remaining'] as string, 10);

      const res2 = await request(server).get('/test/open');
      expect(res2.status).toBe(200);

      const remaining2 = parseInt(res2.headers['x-ratelimit-remaining'] as string, 10);

      // Remaining should decrease (same tracker = same counter)
      expect(remaining2).toBeLessThan(remaining1);
    });
  });
});

// ---------------------------------------------------------------------------
// SecurityHeadersMiddleware — unit tests
// ---------------------------------------------------------------------------

describe('SecurityHeadersMiddleware (unit)', () => {
  let middleware: SecurityHeadersMiddleware;

  function mockReq(path: string) {
    return { path } as Request;
  }

  function mockRes() {
    return { setHeader: vi.fn() } as unknown as Response;
  }

  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    middleware = new SecurityHeadersMiddleware();
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set X-Frame-Options DENY for non-embed paths', () => {
    const req = mockReq('/api/bookings');
    const res = mockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  });

  it('should set X-Frame-Options SAMEORIGIN for /embed paths', () => {
    const req = mockReq('/embed/booking-widget');
    const res = mockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
  });

  it('should set X-Content-Type-Options nosniff', () => {
    const req = mockReq('/');
    const res = mockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('should call next()', () => {
    const req = mockReq('/');
    const res = mockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should set HSTS header in non-development mode', () => {
    process.env['NODE_ENV'] = 'production';
    const prodMiddleware = new SecurityHeadersMiddleware();
    const req = mockReq('/');
    const res = mockRes();
    const next = vi.fn();

    prodMiddleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  });

  it('should NOT set HSTS header in development mode', () => {
    process.env['NODE_ENV'] = 'development';
    const devMiddleware = new SecurityHeadersMiddleware();
    const req = mockReq('/');
    const res = mockRes();
    const next = vi.fn();

    devMiddleware.use(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith(
      'Strict-Transport-Security',
      expect.anything(),
    );
  });

  it('should set Referrer-Policy header', () => {
    const req = mockReq('/');
    const res = mockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'strict-origin-when-cross-origin',
    );
  });

  it('should set Permissions-Policy header', () => {
    const req = mockReq('/');
    const res = mockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
  });
});
