import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  resource: string;
  action: string;
}

export const RequiresPermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);
