import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from './providers/stripe.provider';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate that a client-supplied URL belongs to the configured web origin.
   * Prevents an attacker from steering the Stripe return_url to an
   * arbitrary domain or port.
   */
  private validateReturnUrl(returnUrl: string): string {
    const webUrl = this.configService.get<string>('WEB_URL');
    if (!webUrl) {
      // Missing WEB_URL is server misconfiguration — not a client error.
      throw new ServiceUnavailableException(
        'WEB_URL is not configured — cannot validate return URL',
      );
    }

    let parsed: URL;
    let allowed: URL;
    try {
      parsed = new URL(returnUrl);
      allowed = new URL(webUrl);
    } catch {
      throw new BadRequestException('Invalid return URL');
    }

    // Compare protocol + host (hostname + port). `port` is checked here
    // because `URL.host` includes port only when explicit; we normalize by
    // comparing (hostname, port) pairs separately. Allow both apex and www.
    const normalize = (u: URL) => ({
      hostname: u.hostname.replace(/^www\./, ''),
      port: u.port || (u.protocol === 'https:' ? '443' : '80'),
    });
    const allowedNorm = normalize(allowed);
    const parsedNorm = normalize(parsed);
    if (
      parsed.protocol !== allowed.protocol ||
      parsedNorm.hostname !== allowedNorm.hostname ||
      parsedNorm.port !== allowedNorm.port
    ) {
      throw new BadRequestException(
        `Return URL must be on ${allowed.origin}`,
      );
    }

    return returnUrl;
  }

  /**
   * Create a Stripe Connect Express account for a tenant.
   */
  async createAccount(tenantId: string, email: string, country: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        paymentProviderAccountId: true,
        contactEmail: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.paymentProviderAccountId) {
      throw new BadRequestException(
        'Tenant already has a connected payment account',
      );
    }

    const effectiveEmail = email || tenant.contactEmail;
    if (!effectiveEmail) {
      throw new BadRequestException(
        'Email is required to create a Stripe account',
      );
    }

    const account = await this.stripeProvider.createConnectedAccount(
      effectiveEmail,
      country,
    );

    // Optimistic update: only claim the tenant row if paymentProviderAccountId
    // is still null. If two concurrent "Connect" clicks both created Stripe
    // accounts, the second updateMany returns count=0 and we know this one
    // is orphaned — recoverable by checking the tenant's current account ID.
    const updateResult = await this.prisma.tenant.updateMany({
      where: { id: tenantId, paymentProviderAccountId: null },
      data: {
        paymentProvider: 'STRIPE',
        paymentProviderAccountId: account.accountId,
      },
    });

    if (updateResult.count === 0) {
      // Another concurrent request won the race. Log the orphan so it can be
      // cleaned up in the Stripe Dashboard (we cannot safely delete it here
      // — it may have already had PII submitted).
      this.logger.warn(
        `Race detected on tenant ${tenantId} Stripe account creation. ` +
          `Orphaned account ${account.accountId} left in Stripe — manual cleanup required.`,
      );
      throw new BadRequestException(
        'Tenant already has a connected payment account',
      );
    }

    this.logger.log(
      `Stripe Connect account created for tenant ${tenantId}: ${account.accountId}`,
    );

    return {
      accountId: account.accountId,
      onboardingComplete: account.onboardingComplete,
    };
  }

  /**
   * Get a Stripe onboarding link for the tenant's connected account.
   */
  async getOnboardingLink(tenantId: string, returnUrl: string) {
    // Reject any return URL not on the configured web origin before handing
    // it to Stripe, so the Stripe redirect can't be used to bounce the user
    // to an attacker-controlled domain.
    const safeReturnUrl = this.validateReturnUrl(returnUrl);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { paymentProviderAccountId: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.paymentProviderAccountId) {
      throw new BadRequestException(
        'Tenant does not have a connected payment account. Create one first.',
      );
    }

    const refreshUrl = `${safeReturnUrl}?refresh=true`;
    const url = await this.stripeProvider.getOnboardingLink(
      tenant.paymentProviderAccountId,
      refreshUrl,
      safeReturnUrl,
    );

    return { url };
  }

  /**
   * Get a Stripe dashboard login link for the tenant's connected account.
   */
  async getDashboardLink(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        paymentProviderAccountId: true,
        paymentProviderOnboarded: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.paymentProviderAccountId) {
      throw new BadRequestException('Tenant does not have a connected payment account');
    }

    if (!tenant.paymentProviderOnboarded) {
      throw new BadRequestException(
        'Complete onboarding before accessing the dashboard',
      );
    }

    const url = await this.stripeProvider.getDashboardLink(
      tenant.paymentProviderAccountId,
    );

    return { url };
  }

  /**
   * Check the current status of the tenant's Stripe account.
   * Updates the paymentProviderOnboarded flag if charges are enabled.
   */
  async getStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        paymentProviderAccountId: true,
        paymentProviderOnboarded: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.paymentProviderAccountId) {
      return {
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        onboarded: false,
        restricted: false,
        requirements: null,
      };
    }

    const status = await this.stripeProvider.getAccountStatus(
      tenant.paymentProviderAccountId,
    );

    // If charges just became enabled, update tenant
    if (status.chargesEnabled && !tenant.paymentProviderOnboarded) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { paymentProviderOnboarded: true },
      });

      this.logger.log(`Tenant ${tenantId} Stripe onboarding completed`);
    }

    // "Restricted" = Stripe has deferred or disabled charges pending more
    // info from the tenant. Surface this to the UI so they can be prompted
    // back into the onboarding flow rather than silently failing payments.
    const restricted =
      !!status.requirements &&
      (status.requirements.pastDue.length > 0 ||
        status.requirements.currentlyDue.length > 0 ||
        status.requirements.disabledReason !== null);

    return {
      accountId: status.accountId,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      onboarded: status.chargesEnabled,
      restricted,
      requirements: status.requirements ?? null,
    };
  }

  /**
   * Handle account.application.deauthorized webhook event.
   * Fires when a tenant disconnects the SavSpot platform from their Stripe
   * dashboard. Clears the stored account reference so the tenant returns to
   * the "not connected" state in the UI and can re-onboard if they change
   * their mind. Historical payments remain queryable via providerTransactionId.
   */
  async handleAccountDeauthorized(accountId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { paymentProviderAccountId: accountId },
      select: { id: true, paymentProviderOnboarded: true },
    });

    if (!tenant) {
      this.logger.warn(
        `No tenant found for deauthorized Stripe account ${accountId} — ignoring`,
      );
      return;
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        paymentProviderAccountId: null,
        paymentProviderOnboarded: false,
      },
    });

    this.logger.warn(
      `Tenant ${tenant.id} deauthorized Stripe account ${accountId} — cleared to allow re-onboarding`,
    );
  }

  /**
   * Handle account.updated webhook event.
   * Updates tenant's onboarded status based on charges_enabled.
   */
  async handleAccountUpdate(accountId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { paymentProviderAccountId: accountId },
      select: { id: true, paymentProviderOnboarded: true },
    });

    if (!tenant) {
      this.logger.warn(
        `No tenant found for Stripe account ${accountId} — ignoring`,
      );
      return;
    }

    const status = await this.stripeProvider.getAccountStatus(accountId);

    if (status.chargesEnabled !== tenant.paymentProviderOnboarded) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { paymentProviderOnboarded: status.chargesEnabled },
      });

      this.logger.log(
        `Tenant ${tenant.id} onboarded status updated to ${status.chargesEnabled}`,
      );
    }
  }
}
