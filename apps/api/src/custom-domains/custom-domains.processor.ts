import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_CUSTOM_DOMAINS,
  JOB_CUSTOM_DOMAIN_DNS_VERIFY,
  JOB_CUSTOM_DOMAIN_SSL_RENEW,
  JOB_CUSTOM_DOMAIN_HEALTH_CHECK,
} from '../bullmq/queue.constants';
import { CustomDomainsService } from './custom-domains.service';
import { SslManagerService } from './ssl-manager.service';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUE_CUSTOM_DOMAINS)
export class CustomDomainsProcessor extends WorkerHost {
  private readonly logger = new Logger(CustomDomainsProcessor.name);

  constructor(
    private readonly customDomainsService: CustomDomainsService,
    private readonly sslManager: SslManagerService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case JOB_CUSTOM_DOMAIN_DNS_VERIFY:
        await this.customDomainsService.verifyPendingDomains();
        break;
      case JOB_CUSTOM_DOMAIN_SSL_RENEW:
        await this.renewExpiringSsl();
        break;
      case JOB_CUSTOM_DOMAIN_HEALTH_CHECK:
        await this.healthCheckDomains();
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async renewExpiringSsl(): Promise<void> {
    const activeDomains = await this.prisma.customDomain.findMany({
      where: { status: 'ACTIVE', sslStatus: 'ACTIVE' },
    });

    for (const domain of activeDomains) {
      try {
        await this.sslManager.renewCertificate(domain.domain);
      } catch (error) {
        this.logger.error(`SSL renewal failed for ${domain.domain}: ${error}`);
      }
    }

    this.logger.log(`SSL renewal check complete: ${activeDomains.length} domains`);
  }

  private async healthCheckDomains(): Promise<void> {
    const activeDomains = await this.prisma.customDomain.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const domain of activeDomains) {
      await this.prisma.customDomain.update({
        where: { id: domain.id },
        data: { lastCheckedAt: new Date() },
      });
    }

    this.logger.log(`Health check complete: ${activeDomains.length} domains`);
  }
}
