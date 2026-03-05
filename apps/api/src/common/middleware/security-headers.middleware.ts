import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware that adds CSP, X-Frame-Options,
 * and X-Content-Type-Options headers to all responses.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Content-Security-Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);

    // X-Frame-Options: DENY for all paths except /embed/*
    if (req.path.startsWith('/embed')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    } else {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  }
}
