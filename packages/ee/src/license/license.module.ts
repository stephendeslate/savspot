import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LicenseService } from './license.service';
import { LicenseGuard } from './license.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LicenseService,
    {
      provide: APP_GUARD,
      useClass: LicenseGuard,
    },
  ],
  exports: [LicenseService],
})
export class LicenseModule {}
