import { Global, Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module';
import { DirectoryModule } from '../directory/directory.module';
import { InngestController } from './inngest.controller';
import { inngest } from './inngest.client';

export const INNGEST_CLIENT = 'INNGEST_CLIENT';

@Global()
@Module({
  imports: [
    // Each feature module whose services are consumed by an Inngest function
    // factory is imported here. Phase 4d: CurrencyModule. Phase 4e:
    // DirectoryModule.
    CurrencyModule,
    DirectoryModule,
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
