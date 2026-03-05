import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttle guard that uses user ID for authenticated requests
 * and falls back to IP address for unauthenticated requests.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;

    // If the request has an authenticated user (JWT or API key), use their ID
    const user = request.user as Record<string, unknown> | undefined;
    if (user && (user['sub'] || user['id'])) {
      return (user['sub'] as string) || (user['id'] as string);
    }

    // Fall back to IP address for unauthenticated requests
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]!.trim();
    }

    return request.ip || '0.0.0.0';
  }
}
