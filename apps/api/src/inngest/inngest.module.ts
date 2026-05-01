import { Global, Module } from '@nestjs/common';
import { InngestController } from './inngest.controller';
import { inngest } from './inngest.client';

export const INNGEST_CLIENT = 'INNGEST_CLIENT';

@Global()
@Module({
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
