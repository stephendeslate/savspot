'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  CalendarCheck,
  CreditCard,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

// ---------- Types ----------

interface PortalBooking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  businessName: string;
  totalAmount: string;
  currency: string;
}

interface PortalPayment {
  id: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  businessName: string;
}

interface DashboardData {
  upcomingBookings: PortalBooking[];
  totalBookings: number;
  upcomingCount: number;
  recentPayments: PortalPayment[];
}

// ---------- Helpers ----------

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'NO_SHOW':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
    case 'SUCCEEDED':
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'SENT':
    case 'PENDING':
      return 'bg-blue-100 text-blue-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatAmount(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

// ---------- Component ----------

export default function PortalDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const result = await apiClient.get<DashboardData>(
          '/api/portal/dashboard',
        );
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load dashboard',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboard();
  }, []);

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Error ----------

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </div>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  const dashboard = data ?? {
    upcomingBookings: [],
    totalBookings: 0,
    upcomingCount: 0,
    recentPayments: [],
  };

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a summary of your upcoming appointments and activity.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Bookings
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Upcoming Bookings</CardTitle>
            <CardDescription>
              Your appointments for the next 7 days
            </CardDescription>
          </div>
          <Link
            href="/portal/bookings"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {dashboard.upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-sm font-medium">No upcoming bookings</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                You don&apos;t have any appointments scheduled for the next 7
                days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.upcomingBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/portal/bookings/${booking.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {booking.serviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.businessName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(
                            new Date(booking.startTime),
                            'MMM d, yyyy',
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.startTime), 'h:mm a')}
                          {' - '}
                          {format(new Date(booking.endTime), 'h:mm a')}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getStatusColor(booking.status)}
                      >
                        {formatStatus(booking.status)}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent payments / activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Your last 5 payments</CardDescription>
          </div>
          <Link
            href="/portal/payments"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {dashboard.recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-sm font-medium">No recent payments</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Your payment history will appear here after your first booking
                payment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {payment.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.businessName}
                      {' -- '}
                      {format(
                        new Date(payment.paidAt ?? payment.createdAt),
                        'MMM d, yyyy',
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatAmount(payment.amount, payment.currency)}
                    </span>
                    <Badge
                      variant="outline"
                      className={getPaymentStatusColor(payment.status)}
                    >
                      {formatStatus(payment.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
