'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  ArrowDownRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@savspot/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { apiClient, isSubscriptionError, parseRequiredTier, type ApiError } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/rbac/require-role';
import { UpgradeBanner } from '@/components/upgrade-banner';

// ---------- Types ----------

interface FunnelStep {
  step: string;
  sessions: number;
  dropOffRate: number;
}

interface FunnelData {
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  avgCompletionTimeSec: number;
  steps: FunnelStep[];
}

// ---------- Constants ----------

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (period) {
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { from: from.toISOString(), to };
}

const STEP_LABELS: Record<string, string> = {
  SERVICE_SELECTION: 'Service',
  STAFF_SELECTION: 'Staff',
  VENUE_SELECTION: 'Venue',
  DATE_TIME_PICKER: 'Date & Time',
  GUEST_COUNT: 'Guests',
  QUESTIONNAIRE: 'Questions',
  ADD_ONS: 'Add-ons',
  PRICING_SUMMARY: 'Summary',
  CLIENT_INFO: 'Your Info',
  PAYMENT: 'Payment',
  CONFIRMATION: 'Confirmed',
};

function formatStepName(step: string): string {
  return STEP_LABELS[step] ?? step.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

function formatPercentage(value: number): string {
  if (value > 1) return `${value.toFixed(1)}%`;
  return `${(value * 100).toFixed(1)}%`;
}

// ---------- Bar colors ----------

function getBarColor(dropOffRate: number): string {
  if (dropOffRate > 0.4) return '#ef4444'; // red-500
  if (dropOffRate > 0.2) return '#f59e0b'; // amber-500
  return '#22c55e'; // green-500
}

// ---------- Component ----------

export default function BookingFlowAnalyticsPage() {
  const { tenantId } = useTenant();

  const [data, setData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);
    setUpgradeTier(null);

    const { from, to } = getDateRange(period);
    const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    try {
      const result = await apiClient.get<FunnelData>(
        `/api/tenants/${tenantId}/analytics/funnel?${qs}`,
      );
      setData(result);
    } catch (err) {
      if (isSubscriptionError(err)) {
        setUpgradeTier(parseRequiredTier(err as ApiError) ?? 'Team');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load funnel data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, period]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [tenantId, fetchData]);

  // ---------- Loading ----------

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Upgrade gate ----------

  if (upgradeTier) {
    return (
      <RequireRole minimum="ADMIN">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Booking Flow Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Understand where customers drop off in your booking flow.
            </p>
          </div>
          <UpgradeBanner requiredTier={upgradeTier} feature="Booking Flow Analytics" />
        </div>
      </RequireRole>
    );
  }

  // ---------- KPI cards ----------

  const kpiCards = [
    {
      name: 'Total Sessions',
      value: data ? data.totalSessions.toLocaleString() : '0',
      icon: Users,
    },
    {
      name: 'Completed',
      value: data ? data.completedSessions.toLocaleString() : '0',
      icon: TrendingUp,
    },
    {
      name: 'Conversion Rate',
      value: data ? formatPercentage(data.conversionRate) : '0%',
      icon: BarChart3,
    },
    {
      name: 'Avg. Completion Time',
      value: data ? formatDuration(data.avgCompletionTimeSec) : '0s',
      icon: Clock,
    },
  ];

  // ---------- Chart data ----------

  const chartData = (data?.steps ?? []).map((step) => ({
    name: formatStepName(step.step),
    sessions: step.sessions,
    dropOffRate: step.dropOffRate,
  }));

  // ---------- Render ----------

  return (
    <RequireRole minimum="ADMIN">
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Booking Flow Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Understand where customers drop off in your booking flow.
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                <h3 className="text-lg font-medium">No funnel data yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Funnel analytics will appear here once customers start booking.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 13 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} sessions`,
                      'Sessions',
                    ]}
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  />
                  <Bar dataKey="sessions" radius={[0, 4, 4, 0]} barSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.dropOffRate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Step Detail Table */}
        {(data?.steps ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step-by-Step Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Drop-off Rate</TableHead>
                    <TableHead className="text-right">Drop-offs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.steps.map((step, index) => {
                    const nextSessions = data!.steps[index + 1]?.sessions ?? data!.completedSessions;
                    const dropOffs = step.sessions - nextSessions;

                    return (
                      <TableRow key={step.step}>
                        <TableCell className="font-medium">
                          {formatStepName(step.step)}
                        </TableCell>
                        <TableCell className="text-right">
                          {step.sessions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              step.dropOffRate > 0.4
                                ? 'text-red-600 dark:text-red-400'
                                : step.dropOffRate > 0.2
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-green-600 dark:text-green-400'
                            }
                          >
                            {formatPercentage(step.dropOffRate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {dropOffs > 0 && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                              {dropOffs.toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </RequireRole>
  );
}
