import { Injectable, Logger } from '@nestjs/common';
import { resolve } from 'dns/promises';

@Injectable()
export class DnsVerifierService {
  private readonly logger = new Logger(DnsVerifierService.name);

  async verifyDns(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const txtRecords = await resolve(`_savspot-verify.${domain}`, 'TXT');
      const flatRecords = txtRecords.flat();
      const verified = flatRecords.some((record) => record === expectedToken);

      if (verified) {
        this.logger.log(`DNS TXT verified for ${domain}`);
      }

      return verified;
    } catch (error) {
      this.logger.debug(`DNS lookup failed for ${domain}: ${error}`);
      return false;
    }
  }

  async verifyCname(domain: string, expectedTarget: string): Promise<boolean> {
    try {
      const cnameRecords = await resolve(domain, 'CNAME');
      return cnameRecords.some((record) => record === expectedTarget || record === `${expectedTarget}.`);
    } catch {
      return false;
    }
  }
}
