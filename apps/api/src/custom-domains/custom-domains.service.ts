import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DnsVerifierService } from './dns-verifier.service';
import { SslManagerService } from './ssl-manager.service';
import type { DomainResponse, DomainVerifyResponse, DomainRemoveResponse } from './dto/domain-response.dto';

@Injectable()
export class CustomDomainsService {
  private readonly logger = new Logger(CustomDomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dnsVerifier: DnsVerifierService,
    private readonly sslManager: SslManagerService,
  ) {}

  async addDomain(tenantId: string, domain: string): Promise<DomainResponse> {
    if (process.env['FEATURE_CUSTOM_DOMAINS'] !== 'true') {
      throw new BadRequestException('Custom domains feature is not enabled');
    }

    const existing = await this.prisma.customDomain.findFirst({
      where: {
        OR: [{ domain }, { tenantId }],
      },
      select: { domain: true, tenantId: true },
    });

    if (existing) {
      if (existing.domain === domain) {
        throw new ConflictException('Domain is already in use');
      }
      throw new ConflictException('Tenant already has a custom domain configured. Remove it first.');
    }

    const verificationToken = `svs_verify_${randomBytes(16).toString('hex')}`;

    const customDomain = await this.prisma.customDomain.create({
      data: {
        tenantId,
        domain,
        verificationToken,
        status: 'PENDING_VERIFICATION',
        sslStatus: 'PENDING',
      },
    });

    return {
      ...customDomain,
      dnsInstructions: {
        txt: {
          name: `_savspot-verify.${domain}`,
          value: verificationToken,
        },
        cname: {
          name: domain,
          value: 'custom.savspot.co',
        },
      },
    };
  }

  async getDomainStatus(tenantId: string): Promise<DomainResponse | null> {
    const domain = await this.prisma.customDomain.findUnique({ where: { tenantId } });
    if (!domain) {
      return null;
    }

    return {
      ...domain,
      dnsInstructions: {
        txt: {
          name: `_savspot-verify.${domain.domain}`,
          value: domain.verificationToken,
        },
        cname: {
          name: domain.domain,
          value: 'custom.savspot.co',
        },
      },
    };
  }

  async removeDomain(tenantId: string): Promise<DomainRemoveResponse> {
    const domain = await this.prisma.customDomain.findUnique({ where: { tenantId } });
    if (!domain) {
      throw new NotFoundException('No custom domain configured');
    }

    if (domain.sslStatus === 'ACTIVE') {
      await this.sslManager.revokeCertificate(domain.domain);
    }

    await this.prisma.customDomain.delete({ where: { tenantId } });

    return { removed: true };
  }

  async forceVerify(tenantId: string): Promise<DomainVerifyResponse> {
    const domain = await this.prisma.customDomain.findUnique({ where: { tenantId } });
    if (!domain) {
      throw new NotFoundException('No custom domain configured');
    }

    if (domain.status === 'ACTIVE') {
      return { status: 'ACTIVE', message: 'Domain is already active' };
    }

    const verified = await this.dnsVerifier.verifyDns(domain.domain, domain.verificationToken);

    if (verified) {
      await this.prisma.customDomain.update({
        where: { tenantId },
        data: {
          status: 'DNS_VERIFIED',
          verifiedAt: new Date(),
          lastCheckedAt: new Date(),
        },
      });

      await this.sslManager.provisionCertificate(domain.domain);

      await this.prisma.customDomain.update({
        where: { tenantId },
        data: { status: 'SSL_PROVISIONING', sslStatus: 'ISSUING' },
      });

      return { status: 'DNS_VERIFIED', message: 'DNS verified. SSL certificate is being provisioned.' };
    }

    await this.prisma.customDomain.update({
      where: { tenantId },
      data: { lastCheckedAt: new Date() },
    });

    return { status: domain.status, message: 'DNS verification failed. Please check your DNS records.' };
  }

  async verifyPendingDomains(): Promise<void> {
    const pending = await this.prisma.customDomain.findMany({
      where: {
        status: 'PENDING_VERIFICATION',
        createdAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) },
      },
    });

    for (const domain of pending) {
      try {
        const verified = await this.dnsVerifier.verifyDns(domain.domain, domain.verificationToken);
        if (verified) {
          await this.prisma.customDomain.update({
            where: { id: domain.id },
            data: {
              status: 'DNS_VERIFIED',
              verifiedAt: new Date(),
              lastCheckedAt: new Date(),
            },
          });
          await this.sslManager.provisionCertificate(domain.domain);
          await this.prisma.customDomain.update({
            where: { id: domain.id },
            data: { status: 'SSL_PROVISIONING', sslStatus: 'ISSUING' },
          });
        } else {
          await this.prisma.customDomain.update({
            where: { id: domain.id },
            data: { lastCheckedAt: new Date() },
          });
        }
      } catch (error) {
        this.logger.error(`DNS verification failed for ${domain.domain}: ${error}`);
      }
    }

    await this.prisma.customDomain.updateMany({
      where: {
        status: 'PENDING_VERIFICATION',
        createdAt: { lt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
      },
      data: { status: 'VERIFICATION_FAILED' },
    });
  }

  async renewExpiringSslCertificates(): Promise<void> {
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

  async runHealthChecks(): Promise<void> {
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
