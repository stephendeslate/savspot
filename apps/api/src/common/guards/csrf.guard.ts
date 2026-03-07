import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * CSRF defense-in-depth guard via Origin/Referer validation.
 *
 * The API uses Bearer token auth (Authorization header), which is inherently
 * CSRF-safe since browsers do not auto-attach it cross-origin. This guard
 * adds an additional layer by validating Origin/Referer on state-changing
 * requests (POST, PATCH, PUT, DELETE) to ensure they originate from allowed
 * domains.
 *
 * Exemptions:
 *  - GET, HEAD, OPTIONS (safe methods)
 *  - @Public() routes (webhooks, booking sessions, etc.)
 *  - Requests with X-API-Key header (machine-to-machine)
 *  - Stripe webhook paths (/api/payments/webhook*)
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = ['/api/payments/webhook', '/api/payments/connect-webhook'];

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    this.allowedOrigins = new Set<string>();
    this.allowedOrigins.add(new URL(webUrl).origin);

    // Also allow www variant
    const url = new URL(webUrl);
    if (url.hostname.startsWith('www.')) {
      this.allowedOrigins.add(webUrl.replace('www.', ''));
    } else if (!url.hostname.includes('localhost')) {
      this.allowedOrigins.add(`${url.protocol}//www.${url.hostname}`);
    }

    // Allow API's own origin for server-side requests
    const port = this.configService.get<string>('PORT', '3001');
    this.allowedOrigins.add(`http://localhost:${port}`);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Safe methods don't need CSRF protection
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    // Skip for @Public() routes (webhooks etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Skip for API key auth (machine-to-machine)
    if (request.headers['x-api-key']) {
      return true;
    }

    // Skip for exempt paths (webhook endpoints)
    const path = request.path;
    if (EXEMPT_PATHS.some((exempt) => path.startsWith(exempt))) {
      return true;
    }

    // Validate Origin or Referer header
    const origin = request.headers['origin'];
    const referer = request.headers['referer'];

    if (origin) {
      if (this.allowedOrigins.has(origin)) {
        return true;
      }
      throw new ForbiddenException('Cross-origin request blocked');
    }

    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (this.allowedOrigins.has(refererOrigin)) {
          return true;
        }
      } catch {
        // Invalid referer URL
      }
      throw new ForbiddenException('Cross-origin request blocked');
    }

    // No Origin or Referer: allow (same-origin requests in some browsers
    // don't send Origin for same-site POST). Bearer token auth protects us.
    return true;
  }
}
