import { Global, Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { CurrencyModule } from '../currency/currency.module';
import { CustomDomainsModule } from '../custom-domains/custom-domains.module';
import { DirectoryModule } from '../directory/directory.module';
import { ImportsModule } from '../imports/imports.module';
import { PartnersModule } from '../partners/partners.module';
import { PlatformMetricsModule } from '../platform-metrics/platform-metrics.module';
import { VoiceModule } from '../voice/voice.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { InngestController } from './inngest.controller';
import { inngest } from './inngest.client';

export const INNGEST_CLIENT = 'INNGEST_CLIENT';

@Global()
@Module({
  imports: [
    // Each feature module whose services are consumed by an Inngest function
    // factory is imported here. Phase 4d: CurrencyModule. Phase 4e:
    // DirectoryModule. Phase 4f: PartnersModule. Phase 4g:
    // CustomDomainsModule. Phase 4h: ImportsModule. Phase 4i:
    // PlatformMetricsModule. Phase 4j: VoiceModule. Phase 4k:
    // AccountingModule. Phase 4l: WorkflowsModule (note: WorkflowsModule
    // is also added to app.module via the EE getEeModules() loader; the
    // duplicate import is deduped by NestJS DI).
    CurrencyModule,
    DirectoryModule,
    PartnersModule,
    CustomDomainsModule,
    ImportsModule,
    PlatformMetricsModule,
    VoiceModule,
    AccountingModule,
    WorkflowsModule,
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
