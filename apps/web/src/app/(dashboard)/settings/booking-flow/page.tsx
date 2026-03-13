'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Settings,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/rbac/require-role';

// ---------- Types ----------

interface StepResolution {
  type: string;
  label: string;
  active: boolean;
  reason?: string;
}

interface ServiceSteps {
  serviceId: string;
  serviceName: string;
  steps: StepResolution[];
}

interface BookingFlowData {
  id: string;
  name: string;
  globalSteps: StepResolution[];
  serviceSteps: ServiceSteps[];
}

const STEP_ENABLE_MAP: Record<string, { href: string; feature: string }> = {
  GUEST_COUNT: { href: '/services', feature: 'guest config to a service' },
  QUESTIONNAIRE: { href: '/services', feature: 'an intake form to a service' },
  ADD_ONS: { href: '/services', feature: 'add-ons to a service' },
  PAYMENT: { href: '/settings/payments', feature: 'Stripe' },
  VENUE_SELECTION: { href: '/venues', feature: 'venues' },
};

// ---------- Component ----------

export default function BookingFlowPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [flowData, setFlowData] = useState<BookingFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const fetchBookingFlow = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<BookingFlowData>(
        `/api/tenants/${tenantId}/booking-flow`,
      );
      setFlowData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load booking flow',
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
    void fetchBookingFlow();
  }, [tenantId, fetchBookingFlow]);

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
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RequireRole minimum="ADMIN">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/settings')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Booking Flow</h2>
          <p className="text-sm text-muted-foreground">
            See which steps appear in your booking flow based on your service
            configuration.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {flowData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Steps</CardTitle>
              <CardDescription>
                Steps resolved across all your services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {flowData.globalSteps.map((step) => (
                  <div
                    key={step.type}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    {step.active ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {step.label}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {step.type}
                        </Badge>
                      </div>
                      {step.active && step.reason && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {step.reason}
                        </p>
                      )}
                      {!step.active && STEP_ENABLE_MAP[step.type] && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Configure{' '}
                          {STEP_ENABLE_MAP[step.type]!.feature} to
                          enable.{' '}
                          <Link
                            href={STEP_ENABLE_MAP[step.type]!.href}
                            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                          >
                            <Settings className="h-3 w-3" />
                            Go to settings
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </p>
                      )}
                      {!step.active &&
                        !STEP_ENABLE_MAP[step.type] &&
                        step.reason && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {step.reason}
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {flowData.serviceSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per-Service Steps</CardTitle>
                <CardDescription>
                  Steps that apply to each individual service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {flowData.serviceSteps.map((service) => (
                    <div key={service.serviceId} className="rounded-md border">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-3 text-left hover:bg-accent/50"
                        onClick={() =>
                          setExpandedService(
                            expandedService === service.serviceId
                              ? null
                              : service.serviceId,
                          )
                        }
                      >
                        <span className="text-sm font-medium">
                          {service.serviceName}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {service.steps.length} steps
                          </Badge>
                          {expandedService === service.serviceId ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {expandedService === service.serviceId && (
                        <div className="border-t px-3 pb-3 pt-2">
                          <div className="space-y-2">
                            {service.steps.map((step) => (
                              <div
                                key={step.type}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                                <span className="text-sm">{step.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {step.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
    </RequireRole>
  );
}
