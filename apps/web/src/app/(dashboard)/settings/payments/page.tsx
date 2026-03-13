'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Separator, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface ConnectStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboarded: boolean;
}

// ---------- Component ----------

export default function PaymentsSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const data = await apiClient.get<ConnectStatus>(
          `/api/tenants/${tenantId}/payments/connect/status`,
        );
        setStatus(data);
      } catch (err) {
        // If 404 or no account, treat as not connected
        setStatus({
          accountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          onboarded: false,
        });
        // Only show error for non-404 issues
        if (err instanceof Error && !err.message.includes('404')) {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStatus();
  }, [tenantId]);

  const handleConnect = async () => {
    if (!tenantId) return;
    setConnectLoading(true);
    setError(null);

    try {
      // If no account exists yet, create one first
      if (!status?.accountId) {
        await apiClient.post(
          `/api/tenants/${tenantId}/payments/connect`,
          {},
        );
      }

      // Get onboarding link and redirect
      const returnUrl = `${window.location.origin}${ROUTES.SETTINGS_PAYMENTS}`;
      const data = await apiClient.post<{ url: string }>(
        `/api/tenants/${tenantId}/payments/connect/onboarding`,
        { returnUrl },
      );
      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start Stripe onboarding',
      );
      setConnectLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!tenantId) return;
    setDashboardLoading(true);
    setError(null);

    try {
      const data = await apiClient.post<{ url: string }>(
        `/api/tenants/${tenantId}/payments/connect/dashboard`,
      );
      window.open(data.url, '_blank');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to open Stripe dashboard',
      );
    } finally {
      setDashboardLoading(false);
    }
  };

  // Determine connection state
  const isNotConnected = !status?.accountId;
  const isPartiallyConnected =
    status?.accountId && !status.onboarded;
  const isFullyConnected = status?.onboarded;

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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.SETTINGS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Payment Settings</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Stripe account to accept online payments
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Not Connected */}
      {isNotConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Connect with Stripe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm">
                    Accept credit card payments, debit cards, and other
                    payment methods through Stripe. Funds are deposited
                    directly into your bank account.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  What you will need:
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Business or personal bank account details
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Government-issued ID for identity verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Tax identification number (EIN or SSN)
                  </li>
                </ul>
              </div>

              <Separator />

              <Button
                onClick={handleConnect}
                disabled={connectLoading}
                className="w-full sm:w-auto"
              >
                {connectLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Connect with Stripe
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                You will be redirected to Stripe to complete the
                onboarding process. This usually takes a few minutes.
              </p>

              <p className="text-xs text-muted-foreground">
                A 1% processing fee applies to all transactions processed
                through SavSpot, in addition to standard Stripe fees.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partially Connected */}
      {isPartiallyConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">
                Stripe Account Setup
              </CardTitle>
              <Badge className="bg-yellow-100 text-yellow-800">
                Incomplete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                <p className="text-sm">
                  Your Stripe account has been created but setup is not
                  complete. Please finish the onboarding process to start
                  accepting payments.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Account Status</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatusIndicator
                    label="Details Submitted"
                    enabled={status?.detailsSubmitted ?? false}
                  />
                  <StatusIndicator
                    label="Charges Enabled"
                    enabled={status?.chargesEnabled ?? false}
                  />
                  <StatusIndicator
                    label="Payouts Enabled"
                    enabled={status?.payoutsEnabled ?? false}
                  />
                </div>
              </div>

              <Separator />

              <Button
                onClick={handleConnect}
                disabled={connectLoading}
                className="w-full sm:w-auto"
              >
                {connectLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fully Connected */}
      {isFullyConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">
                Stripe Account
              </CardTitle>
              <Badge className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                <p className="text-sm">
                  Your Stripe account is fully set up and ready to accept
                  payments. Clients can now pay online when booking your
                  services.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Account Status</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatusIndicator
                    label="Details Submitted"
                    enabled={status?.detailsSubmitted ?? false}
                  />
                  <StatusIndicator
                    label="Charges Enabled"
                    enabled={status?.chargesEnabled ?? false}
                  />
                  <StatusIndicator
                    label="Payouts Enabled"
                    enabled={status?.payoutsEnabled ?? false}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={handleOpenDashboard}
                  disabled={dashboardLoading}
                >
                  {dashboardLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Stripe Dashboard
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  A 1% processing fee applies to all transactions processed
                  through SavSpot, in addition to standard Stripe fees.
                </p>
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  To disconnect your Stripe account, please contact
                  support at{' '}
                  <a
                    href="mailto:support@savspot.com"
                    className="text-primary underline"
                  >
                    support@savspot.com
                  </a>
                  . Disconnecting will prevent you from accepting online
                  payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function StatusIndicator({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-3">
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      )}
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {enabled ? 'Active' : 'Pending'}
        </p>
      </div>
    </div>
  );
}
