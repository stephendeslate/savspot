import { Module } from '@nestjs/common';
import { CustomDomainsController } from './custom-domains.controller';
import { CustomDomainsService } from './custom-domains.service';
import { DnsVerifierService } from './dns-verifier.service';
import { SslManagerService } from './ssl-manager.service';

@Module({
  controllers: [CustomDomainsController],
  providers: [CustomDomainsService, DnsVerifierService, SslManagerService],
  exports: [CustomDomainsService],
})
export class CustomDomainsModule {}
