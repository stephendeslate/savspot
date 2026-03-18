import { Injectable } from '@nestjs/common';

/**
 * No-op implementation used when the EE package is not installed.
 * Always returns false — no features are licensed.
 */
@Injectable()
export class NoopLicenseService {
  isLicensed(): boolean {
    return false;
  }

  isTenantLicensed(): boolean {
    return false;
  }
}
