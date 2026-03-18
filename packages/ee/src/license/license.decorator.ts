import { SetMetadata } from '@nestjs/common';

export const REQUIRES_LICENSE_KEY = 'requires_license';

/**
 * Marks an endpoint or controller as requiring a valid EE license.
 * Use alongside @RequiresTier() — they compose independently.
 */
export const RequiresLicense = () =>
  SetMetadata(REQUIRES_LICENSE_KEY, true);
