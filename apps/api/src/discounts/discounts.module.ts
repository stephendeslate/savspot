import { Module } from '@nestjs/common';
import {
  DiscountsAdminController,
  DiscountValidationController,
} from './discounts.controller';
import { DiscountsService } from './discounts.service';

@Module({
  controllers: [DiscountsAdminController, DiscountValidationController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
