import { Global, Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module';
import { CustomDomainsModule } from '../custom-domains/custom-domains.module';
import { DirectoryModule } from '../directory/directory.module';
import { PartnersModule } from '../partners/partners.module';
import { InngestController } from './inngest.controller';
import { inngest } from './inngest.client';

export const INNGEST_CLIENT = 'INNGEST_CLIENT';

@Global()
@Module({
  imports: [
    // Each feature module whose services are consumed by an Inngest function
    // factory is imported here. Phase 4d: CurrencyModule. Phase 4e:
    // DirectoryModule. Phase 4f: PartnersModule. Phase 4g: CustomDomainsModule.
    CurrencyModule,
    DirectoryModule,
    PartnersModule,
    CustomDomainsModule,
  ],
  controllers: [InngestController],
  providers: [
    {
      provide: INNGEST_CLIENT,
      useValue: inngest,
    },
  ],
  exports: [INNGEST_CLIENT],
})
export class InngestModule {}
