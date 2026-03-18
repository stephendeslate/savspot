import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_LICENSE_KEY } from './license.decorator';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresLicense = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_LICENSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresLicense) {
      return true;
    }

    if (!this.licenseService.isLicensed()) {
      throw new ForbiddenException(
        'This feature requires a SavSpot Enterprise license. ' +
          'Visit https://savspot.co/pricing or set SAVSPOT_LICENSE_KEY to enable enterprise features.',
      );
    }

    return true;
  }
}
