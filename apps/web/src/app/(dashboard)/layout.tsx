'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PushPrompt } from '@/components/push-prompt';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SupportWidget } from '@/components/support/support-widget';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/ui/motion';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/lib/constants';

const pageTitles: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.BOOKINGS]: 'Bookings',
  [ROUTES.CALENDAR]: 'Calendar',
  [ROUTES.SERVICES]: 'Services',
  [ROUTES.CLIENTS]: 'Clients',
  [ROUTES.SETTINGS]: 'Settings',
  [ROUTES.SETTINGS_PAYMENTS]: 'Payment Settings',
  [ROUTES.PAYMENTS]: 'Payments',
  [ROUTES.SETTINGS_BRANDING]: 'Branding',
  [ROUTES.SETTINGS_DISCOUNTS]: 'Discounts',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  const title = pageTitles[pathname] ?? '';

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push(ROUTES.LOGIN);
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:block w-64 border-r bg-card" />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 z-30">
          <Sidebar />
        </div>
      </div>

      {/* Mobile nav */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Header
          title={title}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <PushPrompt />
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Floating widgets */}
      <SupportWidget />
      <FeedbackWidget />
    </div>
  );
}
