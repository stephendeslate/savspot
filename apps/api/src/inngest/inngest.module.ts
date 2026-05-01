import { Global, Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module';
import { InngestController } from './inngest.controller';
import { inngest } from './inngest.client';

export const INNGEST_CLIENT = 'INNGEST_CLIENT';

@Global()
@Module({
  imports: [
    // CurrencyModule exports CurrencyService, consumed by the
    // currency-refresh-refresh-rates Inngest function (Phase 4d).
    // As more queues port to Inngest, their feature modules are imported
    // here so the controller can DI their services into function factories.
    CurrencyModule,
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
