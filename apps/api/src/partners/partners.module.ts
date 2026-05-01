import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersAdminController } from './partners-admin.controller';
import { PartnersService } from './partners.service';
import { PartnerPayoutService } from './partner-payout.service';

@Module({
  controllers: [PartnersController, PartnersAdminController],
  providers: [PartnersService, PartnerPayoutService],
  exports: [PartnersService, PartnerPayoutService],
})
export class PartnersModule {}
