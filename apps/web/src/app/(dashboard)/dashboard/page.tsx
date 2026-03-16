'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Briefcase,
  Clock,
  Calendar,
  CreditCard,
  CalendarSync,
  DollarSign,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@savspot/ui';
import { FadeIn } from '@/components/ui/motion';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import {
  queryKeys,
  useServices,
  useAvailabilityRules,
  useStripeStatus,
  useCalendarConnections,
  usePaymentStats,
} from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';

interface DashboardBooking {
  id: string;
  status: string;
  startTime: string;
  clientId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: availabilityRules = [], isLoading: rulesLoading } = useAvailabilityRules();
  const { data: stripeStatus } = useStripeStatus();
  const { data: calendarConns = [] } = useCalendarConnections();
  const { data: paymentStats } = usePaymentStats();

  const { data: bookings = [] } = useQuery({
    queryKey: queryKeys.dashboardBookings(tenantId!),
    queryFn: () =>
      apiClient.get<DashboardBooking[]>(
        `/api/tenants/${tenantId}/bookings`,
      ),
    enabled: !!tenantId,
  });

  const isLoading = servicesLoading || rulesLoading;

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayBookings = bookings.filter(
      (b) => b.startTime?.slice(0, 10) === todayStr && b.status !== 'CANCELLED',
    ).length;

    const upcomingBookings = bookings.filter(
      (b) => new Date(b.startTime) > now && (b.status === 'CONFIRMED' || b.status === 'PENDING'),
    ).length;

    const pendingActions = bookings.filter((b) => b.status === 'PENDING').length;

    const recentClientIds = new Set(
      bookings
        .filter((b) => new Date(b.startTime) >= weekAgo)
        .map((b) => b.clientId),
    );
    const newClientsThisWeek = recentClientIds.size;

    return {
      totalServices: services.length,
      activeServices: services.filter((s: { id: string; isActive: boolean }) => s.isActive).length,
      availabilityRules: availabilityRules.length,
      upcomingBookings,
      todayBookings,
      newClientsThisWeek,
      revenueThisMonth: paymentStats?.totalRevenue ?? 0,
      revenueCurrency: paymentStats?.currency ?? 'USD',
      pendingActions,
      hasStripe: stripeStatus?.connected ?? false,
      hasCalendar: calendarConns.length > 0,
    };
  }, [services, availabilityRules, stripeStatus, calendarConns, bookings, paymentStats]);

  // No tenant: show onboarding CTA
  if (!tenantId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Briefcase className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">Welcome to SavSpot!</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          You haven&apos;t set up your business yet. Complete the onboarding
          process to start managing bookings.
        </p>
        <Button
          className="mt-6"
          size="lg"
          onClick={() => router.push(ROUTES.ONBOARDING)}
        >
          Complete Onboarding
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const formatRevenue = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      name: "Today's Bookings",
      value: stats.todayBookings,
      icon: Calendar,
      description: 'Appointments today',
      accent: 'border-l-primary',
    },
    {
      name: 'Revenue (Month)',
      value: formatRevenue(stats.revenueThisMonth, stats.revenueCurrency),
      icon: DollarSign,
      description: 'This month so far',
      accent: 'border-l-accent',
    },
    {
      name: 'New Clients',
      value: stats.newClientsThisWeek,
      icon: Users,
      description: 'This week',
      accent: 'border-l-primary',
    },
    {
      name: 'Pending Actions',
      value: stats.pendingActions,
      icon: AlertCircle,
      description: 'Bookings awaiting confirmation',
      accent: stats.pendingActions > 0 ? 'border-l-accent' : 'border-l-muted',
    },
  ];

  // Next Best Action recommendations
  const actions: { label: string; description: string; href: string; icon: typeof Plus; priority: number }[] = [];
  if (stats.totalServices === 0) {
    actions.push({ label: 'Add your first service', description: 'Create a bookable service for your clients', href: ROUTES.SERVICES_NEW, icon: Plus, priority: 1 });
  }
  if (stats.availabilityRules === 0) {
    actions.push({ label: 'Set your availability', description: 'Define your working hours so clients can book', href: ROUTES.SETTINGS_AVAILABILITY, icon: Clock, priority: 2 });
  }
  if (!stats.hasStripe) {
    actions.push({ label: 'Connect Stripe', description: 'Accept online payments from your clients', href: ROUTES.SETTINGS_PAYMENTS, icon: CreditCard, priority: 3 });
  }
  if (!stats.hasCalendar) {
    actions.push({ label: 'Connect Google Calendar', description: 'Sync bookings and prevent double-bookings', href: ROUTES.SETTINGS_CALENDAR, icon: CalendarSync, priority: 4 });
  }
  actions.sort((a, b) => a.priority - b.priority);

  const quickActions = [
    {
      name: 'Add Service',
      description: 'Create a new bookable service',
      href: ROUTES.SERVICES_NEW,
      icon: Plus,
    },
    {
      name: 'Manage Availability',
      description: 'Update your working hours',
      href: ROUTES.SETTINGS_AVAILABILITY,
      icon: Clock,
    },
    {
      name: 'View Calendar',
      description: 'See your upcoming schedule',
      href: ROUTES.CALENDAR,
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-lg font-semibold">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of your business.
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="mt-1 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <FadeIn key={stat.name} delay={index * 0.05}>
              <Card className={`border-l-4 ${stat.accent}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}

      {/* Next Best Action — replaces static setup prompts */}
      {!isLoading && actions.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-4 w-4 text-accent" />
              Recommended Next Steps
            </CardTitle>
            <CardDescription>
              Complete these to start accepting bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <Link key={action.label} href={action.href}>
                  <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3 transition-all hover:bg-accent/10 hover:shadow-[var(--shadow-colored)]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/15">
                      <action.icon className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                      Step {i + 1}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to manage your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <div className="flex items-center gap-4 rounded-xl border p-4 transition-all hover:bg-secondary/50 hover:shadow-[var(--shadow-colored)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{action.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
