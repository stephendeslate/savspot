import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CUSTOM_DOMAINS } from '../bullmq/queue.constants';
import { CustomDomainsController } from './custom-domains.controller';
import { CustomDomainsService } from './custom-domains.service';
import { CustomDomainsProcessor } from './custom-domains.processor';
import { DnsVerifierService } from './dns-verifier.service';
import { SslManagerService } from './ssl-manager.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_CUSTOM_DOMAINS })],
  controllers: [CustomDomainsController],
  providers: [CustomDomainsService, CustomDomainsProcessor, DnsVerifierService, SslManagerService],
  exports: [CustomDomainsService],
})
export class CustomDomainsModule {}
