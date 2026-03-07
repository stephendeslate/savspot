import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { SlugService } from './slug.service';
import { QUEUE_GDPR } from '../bullmq/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_GDPR }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, SlugService],
  exports: [TenantsService, SlugService],
})
export class TenantsModule {}
