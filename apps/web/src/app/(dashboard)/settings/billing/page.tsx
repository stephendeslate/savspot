'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface Plan {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: Record<string, number>;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  tier: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Entitlement {
  feature: string;
  allowed: boolean;
  limit: number | null;
  used: number | null;
}

// ---------- Helpers ----------

const TIER_ORDER = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

function getTierBadge(tier: string) {
  switch (tier) {
    case 'FREE':
      return <Badge className="bg-gray-100 text-gray-800">Free</Badge>;
    case 'STARTER':
      return <Badge className="bg-blue-100 text-blue-800">Starter</Badge>;
    case 'PROFESSIONAL':
      return <Badge className="bg-purple-100 text-purple-800">Professional</Badge>;
    case 'ENTERPRISE':
      return <Badge className="bg-amber-100 text-amber-800">Enterprise</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{tier}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'trialing':
      return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
    case 'past_due':
      return <Badge className="bg-red-100 text-red-800">Past Due</Badge>;
    case 'canceled':
      return <Badge className="bg-gray-100 text-gray-800">Canceled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getUsagePercentage(used: number | null, limit: number | null): number {
  if (limit === null || used === null) return 0;
  if (limit === 0) return 100;
  return Math.min(Math.round((used / limit) * 100), 100);
}

// ---------- Component ----------

export default function BillingSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      const [plansData, subData, entData] = await Promise.all([
        apiClient.get<Plan[]>('/api/subscriptions/plans'),
        apiClient.get<Subscription>(
          `/api/subscriptions/${tenantId}/current`,
        ),
        apiClient.get<Entitlement[]>(
          `/api/subscriptions/${tenantId}/entitlements`,
        ),
      ]);

      setPlans(
        (Array.isArray(plansData) ? plansData : []).sort(
          (a, b) =>
            TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
        ),
      );
      setSubscription(subData);
      setEntitlements(Array.isArray(entData) ? entData : []);
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

  const handleCheckout = async (planId: string) => {
    if (!tenantId) return;
    setCheckoutLoading(planId);

    try {
      const result = await apiClient.post<{ url: string }>(
        `/api/subscriptions/${tenantId}/checkout`,
        { planId, interval: billingInterval },
      );
      if (result.url) {
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
                    {subscription.planName}
                  </span>
                  {getTierBadge(subscription.tier)}
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              </div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entitlements / Usage */}
      {entitlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>
              Feature limits and current usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entitlements.map((ent) => {
                const pct = getUsagePercentage(ent.used, ent.limit);
                return (
                  <div key={ent.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">
                        {ent.feature.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      {ent.limit !== null ? (
                        <span className="text-muted-foreground">
                          {ent.used ?? 0} / {ent.limit}
                        </span>
                      ) : ent.allowed ? (
                        <Badge className="bg-green-100 text-green-800">
                          Unlimited
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          Not available
                        </Badge>
                      )}
                    </div>
                    {ent.limit !== null && (
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            pct >= 90
                              ? 'bg-red-500'
                              : pct >= 70
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrentPlan =
                  subscription?.planId === plan.id;
                const price =
                  billingInterval === 'monthly'
                    ? plan.monthlyPrice
                    : plan.yearlyPrice;
                const currentTierIndex = subscription
                  ? TIER_ORDER.indexOf(subscription.tier)
                  : -1;
                const planTierIndex = TIER_ORDER.indexOf(plan.tier);
                const isUpgrade = planTierIndex > currentTierIndex;

                return (
                  <div
                    key={plan.id}
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
                          /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
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
                          onClick={() => handleCheckout(plan.id)}
                          disabled={checkoutLoading === plan.id}
                        >
                          {checkoutLoading === plan.id ? (
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
  );
}
