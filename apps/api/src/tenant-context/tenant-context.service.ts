import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

const TENANT_ID_KEY = 'tenantId';

/**
 * Service for accessing the current tenant context from the CLS store.
 * The tenant ID is set by TenantContextMiddleware for each request.
 */
@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  /**
   * Get the current tenant ID from the CLS store.
   * Returns undefined if no tenant context is set.
   */
  getCurrentTenantId(): string | undefined {
    return this.cls.get<string>(TENANT_ID_KEY);
  }

  /**
   * Get the current tenant ID, throwing UnauthorizedException if not set.
   * Use this in endpoints that always require a tenant context.
   */
  requireCurrentTenantId(): string {
    const tenantId = this.getCurrentTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  /**
   * Set the tenant ID in the CLS store.
   * Typically called by TenantContextMiddleware.
   */
  setCurrentTenantId(tenantId: string): void {
    this.cls.set(TENANT_ID_KEY, tenantId);
  }
}
