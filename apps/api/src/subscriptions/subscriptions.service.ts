import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_FEATURES } from './entitlements';

type SubscriptionTierType = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

interface PlanInfo {
  tier: SubscriptionTierType;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  features: (typeof TIER_FEATURES)[SubscriptionTierType];
}

const PLAN_PRICES: Record<
  'PREMIUM' | 'ENTERPRISE',
  { monthly: number; annualMonthly: number }
> = {
  PREMIUM: { monthly: 29, annualMonthly: 23 },
  ENTERPRISE: { monthly: 79, annualMonthly: 63 },
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe initialized for subscriptions');
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured — subscription operations will fail',
      );
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
      );
    }
    return this.stripe;
  }

  getPlans(): PlanInfo[] {
    return [
      {
        tier: 'FREE',
        name: 'Free',
        monthlyPrice: 0,
        annualMonthlyPrice: 0,
        features: TIER_FEATURES.FREE,
      },
      {
        tier: 'PREMIUM',
        name: 'Premium',
        monthlyPrice: PLAN_PRICES.PREMIUM.monthly,
        annualMonthlyPrice: PLAN_PRICES.PREMIUM.annualMonthly,
        features: TIER_FEATURES.PREMIUM,
      },
      {
        tier: 'ENTERPRISE',
        name: 'Enterprise',
        monthlyPrice: PLAN_PRICES.ENTERPRISE.monthly,
        annualMonthlyPrice: PLAN_PRICES.ENTERPRISE.annualMonthly,
        features: TIER_FEATURES.ENTERPRISE,
      },
    ];
  }

  async getCurrentSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionTier: true,
        subscriptionProviderId: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionGracePeriodEnd: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      tier: tenant.subscriptionTier,
      status: tenant.subscriptionStatus,
      providerId: tenant.subscriptionProviderId,
      currentPeriodEnd: tenant.subscriptionCurrentPeriodEnd,
      gracePeriodEnd: tenant.subscriptionGracePeriodEnd,
    };
  }

  async createCheckoutSession(
    tenantId: string,
    tier: 'PREMIUM' | 'ENTERPRISE',
    isAnnual: boolean,
  ) {
    const stripe = this.ensureStripe();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionProviderId: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.subscriptionTier === tier) {
      throw new BadRequestException(`Already on the ${tier} plan`);
    }

    const prices = PLAN_PRICES[tier];
    const unitAmount = isAnnual
      ? prices.annualMonthly * 100
      : prices.monthly * 100;

    const webUrl = this.configService.get<string>(
      'app.webUrl',
      'http://localhost:3000',
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `SavSpot ${tier.charAt(0) + tier.slice(1).toLowerCase()} Plan`,
              description: isAnnual ? 'Annual billing' : 'Monthly billing',
            },
            unit_amount: unitAmount,
            recurring: {
              interval: isAnnual ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId,
        tier,
        isAnnual: String(isAnnual),
      },
      subscription_data: {
        metadata: {
          tenantId,
          tier,
        },
      },
      success_url: `${webUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/settings/billing?canceled=true`,
    });

    this.logger.log(
      `Checkout session created for tenant ${tenantId}: ${session.id} (${tier}, ${isAnnual ? 'annual' : 'monthly'})`,
    );

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async createPortalSession(tenantId: string) {
    const stripe = this.ensureStripe();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionProviderId: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.subscriptionProviderId) {
      throw new BadRequestException('No active subscription to manage');
    }

    const subscription = await stripe.subscriptions.retrieve(
      tenant.subscriptionProviderId,
    );

    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const webUrl = this.configService.get<string>(
      'app.webUrl',
      'http://localhost:3000',
    );

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${webUrl}/settings/billing`,
    });

    return {
      url: portalSession.url,
    };
  }

  getEntitlements(tier: SubscriptionTierType) {
    return TIER_FEATURES[tier];
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      default:
        this.logger.log(
          `Unhandled subscription webhook event: ${event.type}`,
        );
    }
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn('Invoice payment failed but no subscription ID found');
      return;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { subscriptionProviderId: subscriptionId },
      select: { id: true },
    });

    if (!tenant) {
      this.logger.warn(
        `No tenant found for subscription ${subscriptionId}`,
      );
      return;
    }

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'PAST_DUE',
        subscriptionGracePeriodEnd: gracePeriodEnd,
      },
    });

    this.logger.log(
      `Tenant ${tenant.id} subscription set to PAST_DUE, grace period ends ${gracePeriodEnd.toISOString()}`,
    );
  }

  private async handleInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { subscriptionProviderId: subscriptionId },
      select: { id: true },
    });

    if (!tenant) {
      this.logger.warn(
        `No tenant found for subscription ${subscriptionId}`,
      );
      return;
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionGracePeriodEnd: null,
      },
    });

    this.logger.log(
      `Tenant ${tenant.id} subscription set to ACTIVE after payment`,
    );
  }

  private async handleSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    const tenant = await this.prisma.tenant.findFirst({
      where: { subscriptionProviderId: subscription.id },
      select: { id: true },
    });

    if (!tenant) {
      this.logger.warn(
        `No tenant found for subscription ${subscription.id}`,
      );
      return;
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'CANCELED',
        subscriptionProviderId: null,
        subscriptionCurrentPeriodEnd: null,
        subscriptionGracePeriodEnd: null,
      },
    });

    this.logger.log(
      `Tenant ${tenant.id} subscription canceled, downgraded to FREE`,
    );
  }

  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId = subscription.metadata?.['tenantId'];
    const tier = subscription.metadata?.['tier'] as
      | SubscriptionTierType
      | undefined;

    const tenant = tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true },
        })
      : await this.prisma.tenant.findFirst({
          where: { subscriptionProviderId: subscription.id },
          select: { id: true },
        });

    if (!tenant) {
      this.logger.warn(
        `No tenant found for subscription ${subscription.id}`,
      );
      return;
    }

    const validTier =
      tier && (['FREE', 'PREMIUM', 'ENTERPRISE'] as const).includes(tier)
        ? tier
        : undefined;

    let subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'TRIALING' | undefined;
    let clearGracePeriod = false;

    if (subscription.status === 'active') {
      subscriptionStatus = 'ACTIVE';
      clearGracePeriod = true;
    } else if (subscription.status === 'past_due') {
      subscriptionStatus = 'PAST_DUE';
    } else if (subscription.status === 'trialing') {
      subscriptionStatus = 'TRIALING';
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionProviderId: subscription.id,
        subscriptionCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ),
        ...(validTier ? { subscriptionTier: validTier } : {}),
        ...(subscriptionStatus ? { subscriptionStatus } : {}),
        ...(clearGracePeriod ? { subscriptionGracePeriodEnd: null } : {}),
      },
    });

    this.logger.log(
      `Tenant ${tenant.id} subscription updated: status=${subscription.status}`,
    );
  }
}
