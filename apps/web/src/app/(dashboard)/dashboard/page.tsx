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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/ui/motion';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import {
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
    queryKey: ['dashboard-bookings', tenantId],
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
    },
    {
      name: 'Revenue (Month)',
      value: formatRevenue(stats.revenueThisMonth, stats.revenueCurrency),
      icon: DollarSign,
      description: 'This month so far',
    },
    {
      name: 'New Clients',
      value: stats.newClientsThisWeek,
      icon: Users,
      description: 'This week',
    },
    {
      name: 'Pending Actions',
      value: stats.pendingActions,
      icon: AlertCircle,
      description: 'Bookings awaiting confirmation',
    },
  ];

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
              <Card>
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
            </FadeIn>
          ))}
        </div>
      )}

      {/* Setup Prompts */}
      {!isLoading && (stats.totalServices === 0 || stats.availabilityRules === 0 || !stats.hasStripe || !stats.hasCalendar) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Complete Your Setup
            </CardTitle>
            <CardDescription>
              Finish configuring these items to start accepting bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.totalServices === 0 && (
                <Link href={ROUTES.SERVICES_NEW}>
                  <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900">
                    <Plus className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Add your first service</p>
                      <p className="text-xs text-muted-foreground">Create a bookable service for your clients</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
              {stats.availabilityRules === 0 && (
                <Link href={ROUTES.SETTINGS_AVAILABILITY}>
                  <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Set your availability</p>
                      <p className="text-xs text-muted-foreground">Define your working hours so clients can book</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
              {!stats.hasStripe && (
                <Link href={ROUTES.SETTINGS_PAYMENTS}>
                  <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Connect Stripe</p>
                      <p className="text-xs text-muted-foreground">Accept online payments from your clients</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
              {!stats.hasCalendar && (
                <Link href={ROUTES.SETTINGS_CALENDAR}>
                  <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900">
                    <CalendarSync className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Connect Google Calendar</p>
                      <p className="text-xs text-muted-foreground">Sync your bookings and prevent double-bookings</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
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
                <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
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
