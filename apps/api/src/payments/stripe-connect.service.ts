import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from './providers/stripe.provider';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
  ) {}

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

    // Update tenant with the new account ID
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        paymentProvider: 'STRIPE',
        paymentProviderAccountId: account.accountId,
      },
    });

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

    const refreshUrl = `${returnUrl}?refresh=true`;
    const url = await this.stripeProvider.getOnboardingLink(
      tenant.paymentProviderAccountId,
      refreshUrl,
      returnUrl,
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

    return {
      accountId: status.accountId,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      onboarded: status.chargesEnabled,
    };
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
