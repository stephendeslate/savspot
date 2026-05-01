import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_PARTNERS } from '../bullmq/queue.constants';
import { PartnersController } from './partners.controller';
import { PartnersAdminController } from './partners-admin.controller';
import { PartnersService } from './partners.service';
import { PartnerPayoutService } from './partner-payout.service';
import { PartnersProcessor } from './partners.processor';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_PARTNERS })],
  controllers: [PartnersController, PartnersAdminController],
  providers: [PartnersService, PartnerPayoutService, PartnersProcessor],
  exports: [PartnersService, PartnerPayoutService],
})
export class PartnersModule {}
