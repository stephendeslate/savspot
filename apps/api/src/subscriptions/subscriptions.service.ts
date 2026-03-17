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

type SubscriptionTierType = 'STARTER' | 'TEAM' | 'BUSINESS';

export interface PlanInfo {
  tier: SubscriptionTierType;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  perSeat: boolean;
  features: (typeof TIER_FEATURES)[SubscriptionTierType];
}

const PLAN_PRICES: Record<
  'STARTER' | 'TEAM',
  { monthly: number; annualMonthly: number }
> = {
  STARTER: { monthly: 9, annualMonthly: 7 },
  TEAM: { monthly: 7, annualMonthly: 5 },
};

/** All new cloud tenants get a 14-day free trial */
const TRIAL_PERIOD_DAYS = 14;

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
        tier: 'STARTER',
        name: 'Starter',
        monthlyPrice: PLAN_PRICES.STARTER.monthly,
        annualMonthlyPrice: PLAN_PRICES.STARTER.annualMonthly,
        perSeat: false,
        features: TIER_FEATURES.STARTER,
      },
      {
        tier: 'TEAM',
        name: 'Team',
        monthlyPrice: PLAN_PRICES.TEAM.monthly,
        annualMonthlyPrice: PLAN_PRICES.TEAM.annualMonthly,
        perSeat: true,
        features: TIER_FEATURES.TEAM,
      },
      {
        tier: 'BUSINESS',
        name: 'Business',
        monthlyPrice: 0,
        annualMonthlyPrice: 0,
        perSeat: true,
        features: TIER_FEATURES.BUSINESS,
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
    tier: 'STARTER' | 'TEAM',
    isAnnual: boolean,
    seatCount?: number,
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

    const quantity = tier === 'TEAM' ? (seatCount ?? 2) : 1;

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
              name: `SavSpot ${tier === 'STARTER' ? 'Starter' : 'Team'} Plan`,
              description: `${isAnnual ? 'Annual billing' : 'Monthly billing'}${tier === 'TEAM' ? ` — ${quantity} seats` : ''}`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: isAnnual ? 'year' : 'month',
            },
          },
          quantity,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          tenantId,
          tier,
        },
      },
      metadata: {
        tenantId,
        tier,
        isAnnual: String(isAnnual),
        seatCount: String(quantity),
      },
      success_url: `${webUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/settings/billing?canceled=true`,
    });

    this.logger.log(
      `Checkout session created for tenant ${tenantId}: ${session.id} (${tier}, ${isAnnual ? 'annual' : 'monthly'}, ${quantity} seats)`,
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
    const sub = (invoice as unknown as Record<string, unknown>)['subscription'] as
      | string
      | { id: string }
      | null;
    const subscriptionId = typeof sub === 'string' ? sub : sub?.id;

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
    const sub = (invoice as unknown as Record<string, unknown>)['subscription'] as
      | string
      | { id: string }
      | null;
    const subscriptionId = typeof sub === 'string' ? sub : sub?.id;

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

    // When subscription is canceled, tenant loses access (no free tier)
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'CANCELED',
        subscriptionProviderId: null,
        subscriptionCurrentPeriodEnd: null,
        subscriptionGracePeriodEnd: null,
      },
    });

    this.logger.log(
      `Tenant ${tenant.id} subscription canceled`,
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

    const validTiers: readonly SubscriptionTierType[] = ['STARTER', 'TEAM', 'BUSINESS'];
    const validTier = tier && validTiers.includes(tier) ? tier : undefined;

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
          ((subscription as unknown as Record<string, number>)['current_period_end'] ?? 0) * 1000,
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
