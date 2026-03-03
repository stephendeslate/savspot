import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { SlugService } from './slug.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, SlugService],
  exports: [TenantsService, SlugService],
})
export class TenantsModule {}
