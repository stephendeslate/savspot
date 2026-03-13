'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/auth/require-role';

// ---------- Types ----------

interface PlanFeatures {
  maxStaff: number;
  maxBookingsPerMonth: number;
  smsAllocation: number;
  embedModes: readonly string[];
  clientManagement: string;
  contracts: string;
  analytics: string;
  teamManagement: boolean;
  multiLocation: boolean;
  customTemplates: boolean;
  perStaffOveragePrice?: number;
}

interface Plan {
  tier: string;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  features: PlanFeatures;
}

interface Subscription {
  tier: string;
  status: string | null;
  providerId: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
}

// ---------- Helpers ----------

const TIER_ORDER = ['FREE', 'PRO'];

function getTierBadge(tier: string) {
  switch (tier) {
    case 'FREE':
      return <Badge className="bg-gray-100 text-gray-800">Free</Badge>;
    case 'PRO':
      return <Badge className="bg-blue-100 text-blue-800">Pro</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{tier}</Badge>;
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'TRIALING':
      return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
    case 'PAST_DUE':
      return <Badge className="bg-red-100 text-red-800">Past Due</Badge>;
    case 'CANCELED':
      return <Badge className="bg-gray-100 text-gray-800">Canceled</Badge>;
    default:
      return status ? <Badge className="bg-gray-100 text-gray-800">{status}</Badge> : null;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEntitlements(features: PlanFeatures): { label: string; value: string }[] {
  return [
    { label: 'Staff Members', value: String(features.maxStaff) },
    { label: 'Bookings / Month', value: features.maxBookingsPerMonth === Infinity || features.maxBookingsPerMonth > 999999 ? 'Unlimited' : String(features.maxBookingsPerMonth) },
    { label: 'SMS Allocation', value: features.smsAllocation === 0 ? 'Not included' : String(features.smsAllocation) },
    { label: 'Client Management', value: features.clientManagement === 'full' ? 'Full' : 'Basic' },
    { label: 'Analytics', value: features.analytics.charAt(0).toUpperCase() + features.analytics.slice(1) },
    { label: 'Team Management', value: features.teamManagement ? 'Yes' : 'No' },
    { label: 'Multi-Location', value: features.multiLocation ? 'Yes' : 'No' },
    { label: 'Custom Templates', value: features.customTemplates ? 'Yes' : 'No' },
    { label: 'Processing Fee', value: '1% on all transactions' },
  ];
}

function featuresToStrings(features: PlanFeatures): string[] {
  const items: string[] = [];
  items.push(`Up to ${features.maxStaff} staff member${features.maxStaff > 1 ? 's' : ''}`);
  items.push(features.maxBookingsPerMonth === Infinity || features.maxBookingsPerMonth > 999999 ? 'Unlimited bookings' : `${features.maxBookingsPerMonth} bookings/month`);
  if (features.smsAllocation > 0) items.push(`${features.smsAllocation} SMS/month`);
  if (features.analytics !== 'basic') items.push(`${features.analytics.charAt(0).toUpperCase() + features.analytics.slice(1)} analytics`);
  if (features.teamManagement) items.push('Team management');
  if (features.multiLocation) items.push('Multi-location support');
  if (features.customTemplates) items.push('Custom templates');
  if (features.clientManagement === 'full') items.push('Full client management');
  items.push('1% processing fee on transactions');
  return items;
}

// ---------- Component ----------

export default function BillingSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setEntitlements] = useState<PlanFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      const results = await Promise.allSettled([
        apiClient.get<Plan[]>('/api/subscriptions/plans'),
        apiClient.get<Subscription>(
          `/api/subscriptions/${tenantId}/current`,
        ),
        apiClient.get<PlanFeatures>(
          `/api/subscriptions/${tenantId}/entitlements`,
        ),
      ]);

      const [plansResult, subResult, entResult] = results;

      if (plansResult.status === 'fulfilled') {
        setPlans(
          (Array.isArray(plansResult.value) ? plansResult.value : []).sort(
            (a, b) =>
              TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
          ),
        );
      }

      if (subResult.status === 'fulfilled') {
        setSubscription(subResult.value);
      }

      if (entResult.status === 'fulfilled' && entResult.value && typeof entResult.value === 'object') {
        setEntitlements(entResult.value);
      }

      // Only show error if plans failed (the essential data)
      if (plansResult.status === 'rejected') {
        const reason = plansResult.reason;
        setError(reason instanceof Error ? reason.message : 'Failed to load billing data');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load billing data',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [tenantId, fetchData]);

  const handleCheckout = async (tier: string) => {
    if (!tenantId) return;
    setCheckoutLoading(tier);

    try {
      const result = await apiClient.post<{ url: string }>(
        `/api/subscriptions/${tenantId}/checkout`,
        { tier, isAnnual: billingInterval === 'yearly' },
      );
      if (result.url) {
        const checkoutUrl = new URL(result.url);
        if (!['checkout.stripe.com'].includes(checkoutUrl.hostname)) {
          throw new Error('Invalid checkout URL');
        }
        window.location.href = result.url;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start checkout',
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!tenantId) return;
    setPortalLoading(true);

    try {
      const result = await apiClient.post<{ url: string }>(
        `/api/subscriptions/${tenantId}/portal`,
      );
      if (result.url) {
        const portalUrl = new URL(result.url);
        if (!['billing.stripe.com'].includes(portalUrl.hostname)) {
          throw new Error('Invalid portal URL');
        }
        window.location.href = result.url;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to open billing portal',
      );
    } finally {
      setPortalLoading(false);
    }
  };

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-medium">No business found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please complete onboarding to set up your business.
        </p>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <RequireRole minimum="ADMIN">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(ROUTES.SETTINGS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Billing & Plans</h2>
            <p className="text-sm text-muted-foreground">
              Manage your subscription plan and billing
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Current Plan */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan</CardTitle>
            <CardDescription>
              Your active subscription details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">
                    {subscription.tier.charAt(0) + subscription.tier.slice(1).toLowerCase()}
                  </span>
                  {getTierBadge(subscription.tier)}
                  {getStatusBadge(subscription.status)}
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
              </div>
              {subscription.providerId && (
                <Button
                  variant="outline"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Billing
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entitlements / Usage */}
      {entitlements && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Limits</CardTitle>
            <CardDescription>
              Features and limits on your current plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formatEntitlements(entitlements).map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Available Plans</CardTitle>
                <CardDescription>
                  Compare plans and choose the best fit
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    billingInterval === 'monthly'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setBillingInterval('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    billingInterval === 'yearly'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setBillingInterval('yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => {
                const isCurrentPlan =
                  subscription?.tier === plan.tier;
                const price =
                  billingInterval === 'monthly'
                    ? plan.monthlyPrice
                    : plan.annualMonthlyPrice;
                const currentTierIndex = subscription
                  ? TIER_ORDER.indexOf(subscription.tier)
                  : -1;
                const planTierIndex = TIER_ORDER.indexOf(plan.tier);
                const isUpgrade = planTierIndex > currentTierIndex;

                return (
                  <div
                    key={plan.tier}
                    className={`rounded-lg border p-4 ${
                      isCurrentPlan
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold">{plan.name}</h4>
                        {getTierBadge(plan.tier)}
                      </div>
                      <div>
                        <span className="text-2xl font-bold">
                          ${price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /mo{billingInterval === 'yearly' ? ' (billed yearly)' : ''}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {featuresToStrings(plan.features).map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          Current Plan
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full"
                          onClick={() => handleCheckout(plan.tier)}
                          disabled={checkoutLoading === plan.tier}
                        >
                          {checkoutLoading === plan.tier ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            'Upgrade'
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handlePortal}
                          disabled={portalLoading}
                        >
                          Contact Support
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </RequireRole>
  );
}
