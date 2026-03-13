'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarCheck,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@savspot/ui';
import { ApiError, apiClient, isSubscriptionError, parseRequiredTier } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/auth/require-role';
import { formatAmount } from '@/lib/format-utils';
import { UpgradeBanner } from '@/components/upgrade-banner';

// ---------- Types ----------

interface AnalyticsOverview {
  totalBookings: number;
  totalRevenue: string;
  totalClients: number;
  averageBookingValue: string;
  completionRate: number;
  cancellationRate: number;
}

interface RevenueData {
  period: string;
  revenue: string;
  bookings: number;
}

interface StaffPerformance {
  staffId: string;
  staffName: string;
  totalBookings: number;
  revenue: string;
  averageRating: number;
  completionRate: number;
}

// ---------- Constants ----------

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
];

const PERIOD_TO_GROUP_BY: Record<string, string> = {
  '7d': 'day',
  '30d': 'day',
  '90d': 'week',
  '12m': 'month',
};

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (period) {
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '12m':
      from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { from: from.toISOString(), to };
}

// ---------- Component ----------

export default function AnalyticsPage() {
  const { tenantId } = useTenant();

  // Data state
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [staffData, setStaffData] = useState<StaffPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueUpgrade, setRevenueUpgrade] = useState<string | null>(null);
  const [staffUpgrade, setStaffUpgrade] = useState<string | null>(null);

  // Filter state
  const [period, setPeriod] = useState<string>('30d');

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);
    setRevenueUpgrade(null);
    setStaffUpgrade(null);

    const { from, to } = getDateRange(period);
    const groupBy = PERIOD_TO_GROUP_BY[period] ?? 'day';
    const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&groupBy=${groupBy}`;

    const results = await Promise.allSettled([
      apiClient.get<AnalyticsOverview>(
        `/api/tenants/${tenantId}/analytics/overview?${qs}`,
      ),
      apiClient.get<RevenueData[]>(
        `/api/tenants/${tenantId}/analytics/revenue?${qs}`,
      ),
      apiClient.get<StaffPerformance[]>(
        `/api/tenants/${tenantId}/analytics/staff-performance?${qs}`,
      ),
    ]);

    const [overviewResult, revenueResult, staffResult] = results;

    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value);
    } else if (isSubscriptionError(overviewResult.reason)) {
      // Overview shouldn't be gated, but handle gracefully if it is
      setError(null);
    } else {
      const reason = overviewResult.reason;
      const msg = reason instanceof Error ? reason.message : 'Failed to load analytics overview';
      setError(msg);
    }

    if (revenueResult.status === 'fulfilled') {
      setRevenueData(revenueResult.value);
    } else if (isSubscriptionError(revenueResult.reason)) {
      setRevenueUpgrade(parseRequiredTier(revenueResult.reason as ApiError) ?? 'Premium');
    }

    if (staffResult.status === 'fulfilled') {
      setStaffData(staffResult.value);
    } else if (isSubscriptionError(staffResult.reason)) {
      setStaffUpgrade(parseRequiredTier(staffResult.reason as ApiError) ?? 'Enterprise');
    }

    setIsLoading(false);
  }, [tenantId, period]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [tenantId, fetchData]);

  const formatPercentage = (value: number): string => {
    if (value > 1) {
      return `${value.toFixed(1)}%`;
    }
    return `${(value * 100).toFixed(1)}%`;
  };

  // ---------- Stat cards ----------

  const primaryStatCards = [
    {
      name: 'Total Bookings',
      value: overview ? String(overview.totalBookings) : '0',
      icon: CalendarCheck,
      description: 'All time bookings',
    },
    {
      name: 'Total Revenue',
      value: overview ? formatAmount(overview.totalRevenue, 'USD') : '$0.00',
      icon: DollarSign,
      description: 'All time revenue',
    },
    {
      name: 'Total Clients',
      value: overview ? String(overview.totalClients) : '0',
      icon: Users,
      description: 'Unique clients served',
    },
    {
      name: 'Avg Booking Value',
      value: overview
        ? formatAmount(overview.averageBookingValue, 'USD')
        : '$0.00',
      icon: TrendingUp,
      description: 'Average per booking',
    },
  ];

  const secondaryStatCards = [
    {
      name: 'Completion Rate',
      value: overview ? formatPercentage(overview.completionRate) : '0.0%',
      icon: CheckCircle,
      description: 'Bookings completed',
    },
    {
      name: 'Cancellation Rate',
      value: overview ? formatPercentage(overview.cancellationRate) : '0.0%',
      icon: XCircle,
      description: 'Bookings cancelled',
    },
  ];

  // ---------- Loading ----------

  if (isLoading && !overview) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-48" />
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
                <Skeleton className="mt-1 h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <RequireRole minimum="ADMIN">
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('CSV export not yet implemented');
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Primary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryStatCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {secondaryStatCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueUpgrade ? (
            <UpgradeBanner requiredTier={revenueUpgrade} feature="Revenue Trends" />
          ) : revenueData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No revenue data yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Revenue trends will appear here once bookings generate revenue.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Bookings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell>{row.period}</TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(row.revenue, 'USD')}
                    </TableCell>
                    <TableCell>{row.bookings}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Staff Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {staffUpgrade ? (
            <UpgradeBanner requiredTier={staffUpgrade} feature="Staff Performance" />
          ) : staffData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No staff data yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Staff performance metrics will appear here once bookings are
                assigned to staff members.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Avg Rating</TableHead>
                  <TableHead>Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffData.map((staff) => (
                  <TableRow key={staff.staffId}>
                    <TableCell className="font-medium">
                      {staff.staffName}
                    </TableCell>
                    <TableCell>{staff.totalBookings}</TableCell>
                    <TableCell>{formatAmount(staff.revenue, 'USD')}</TableCell>
                    <TableCell>
                      {staff.averageRating > 0
                        ? staff.averageRating.toFixed(1)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {formatPercentage(staff.completionRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </RequireRole>
  );
}
