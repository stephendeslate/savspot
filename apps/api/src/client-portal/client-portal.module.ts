import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { PaymentsModule } from '../payments/payments.module';
import { QUEUE_GDPR } from '../bullmq/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_GDPR }), PaymentsModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
})
export class ClientPortalModule {}
