import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';

/**
 * Middleware that establishes the tenant context for each request.
 *
 * Extracts tenant ID from:
 * 1. JWT claim (req.user.tenantId) — set by the JWT auth strategy
 * 2. URL parameter (req.params.tenantId) — for public tenant routes
 *
 * When a tenant ID is found, it:
 * - Stores it in the CLS store (for application-layer access)
 * - Sets the PostgreSQL session variable `app.current_tenant` (for RLS)
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Extract tenant ID from JWT claim or URL parameter
    const user = req.user as Record<string, unknown> | undefined;
    const jwtTenantId = user?.['tenantId'] as string | undefined;
    const paramTenantId = req.params?.['tenantId'];
    const tenantId = jwtTenantId || (typeof paramTenantId === 'string' ? paramTenantId : undefined);

    if (tenantId) {
      // Store in CLS for application-layer access
      this.tenantContextService.setCurrentTenantId(tenantId);

      // Set PostgreSQL session variable for RLS policies
      try {
        await this.prismaService.$executeRaw`
          SELECT set_config('app.current_tenant', ${tenantId}, TRUE)
        `;
      } catch (error) {
        this.logger.error(
          `Failed to set tenant context for tenant ${tenantId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // Don't block the request — RLS will still deny access
        // if the session variable is not set
      }
    }

    next();
  }
}
