import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [
    ServicesController,
    ServiceCategoriesController,
    VenuesController,
  ],
  providers: [ServicesService, ServiceCategoriesService, VenuesService],
  exports: [ServicesService, ServiceCategoriesService, VenuesService],
})
export class ServicesModule {}
