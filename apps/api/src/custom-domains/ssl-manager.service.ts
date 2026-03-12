import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SslManagerService {
  private readonly logger = new Logger(SslManagerService.name);

  async provisionCertificate(domain: string): Promise<void> {
    const provider = process.env['CUSTOM_DOMAIN_SSL_PROVIDER'] ?? 'manual';

    switch (provider) {
      case 'fly':
        this.logger.log(`[STUB] Would run: fly certs add ${domain} --app ${process.env['FLY_APP_NAME'] ?? 'savspot-api'}`);
        break;
      case 'vercel':
        this.logger.log(`[STUB] Would call Vercel Domains API to add ${domain}`);
        break;
      default:
        this.logger.log(`[MANUAL] SSL certificate must be provisioned manually for ${domain}`);
    }
  }

  async revokeCertificate(domain: string): Promise<void> {
    const provider = process.env['CUSTOM_DOMAIN_SSL_PROVIDER'] ?? 'manual';
    this.logger.log(`[${provider.toUpperCase()}] Revoking SSL certificate for ${domain}`);
  }

  async renewCertificate(domain: string): Promise<void> {
    this.logger.log(`Renewing SSL certificate for ${domain}`);
    await this.provisionCertificate(domain);
  }
}
