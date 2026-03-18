import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LicenseService {
  private cachedResult: boolean | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Check if the current instance has a valid EE license.
   * Checks SAVSPOT_LICENSE_KEY env var first, then can be extended
   * to check tenant-level license keys from the database.
   */
  isLicensed(): boolean {
    if (this.cachedResult !== null) {
      return this.cachedResult;
    }

    const key = this.config.get<string>('SAVSPOT_LICENSE_KEY');
    this.cachedResult = !!key && key.length > 0;
    return this.cachedResult;
  }

  /**
   * Check if a specific tenant has a license key.
   * This is called by the guard when per-tenant licensing is needed.
   */
  isTenantLicensed(tenantLicenseKey: string | null | undefined): boolean {
    // Global license covers all tenants
    if (this.isLicensed()) {
      return true;
    }
    // Per-tenant license key
    return !!tenantLicenseKey && tenantLicenseKey.length > 0;
  }
}
