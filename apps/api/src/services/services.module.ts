import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';
import { ServiceAddonsController } from './service-addons.controller';
import { ServiceAddonsService } from './service-addons.service';
import { ServiceProvidersController } from './service-providers.controller';
import { ServiceProvidersService } from './service-providers.service';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [
    ServicesController,
    ServiceCategoriesController,
    ServiceAddonsController,
    ServiceProvidersController,
    VenuesController,
  ],
  providers: [
    ServicesService,
    ServiceCategoriesService,
    ServiceAddonsService,
    ServiceProvidersService,
    VenuesService,
  ],
  exports: [
    ServicesService,
    ServiceCategoriesService,
    ServiceAddonsService,
    ServiceProvidersService,
    VenuesService,
  ],
})
export class ServicesModule {}
