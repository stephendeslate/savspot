'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  CheckCircle,
  Clock,
  Calendar,
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
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';

interface DashboardStats {
  totalServices: number;
  activeServices: number;
  availabilityRules: number;
  upcomingBookings: number;
}

interface Service {
  id: string;
  isActive: boolean;
}

interface AvailabilityRule {
  id: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    totalServices: 0,
    activeServices: 0,
    availabilityRules: 0,
    upcomingBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch services and availability rules in parallel
        const [services, availabilityRules] = await Promise.all([
          apiClient
            .get<Service[]>(`/api/tenants/${tenantId}/services`)
            .catch(() => [] as Service[]),
          apiClient
            .get<AvailabilityRule[]>(
              `/api/tenants/${tenantId}/availability-rules`,
            )
            .catch(() => [] as AvailabilityRule[]),
        ]);

        setStats({
          totalServices: services.length,
          activeServices: services.filter((s) => s.isActive).length,
          availabilityRules: availabilityRules.length,
          upcomingBookings: 0,
        });
      } catch {
        // Fallback to zero stats
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStats();
  }, [tenantId]);

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

  const statCards = [
    {
      name: 'Total Services',
      value: stats.totalServices,
      icon: Briefcase,
      description: 'Services configured',
    },
    {
      name: 'Active Services',
      value: stats.activeServices,
      icon: CheckCircle,
      description: 'Available for booking',
    },
    {
      name: 'Availability Rules',
      value: stats.availabilityRules,
      icon: Clock,
      description: 'Schedule rules set',
    },
    {
      name: 'Upcoming Bookings',
      value: stats.upcomingBookings,
      icon: Calendar,
      description: 'Scheduled ahead',
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
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
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
