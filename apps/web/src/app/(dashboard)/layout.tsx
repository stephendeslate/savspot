'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, COLLAPSED_KEY } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PushPrompt } from '@/components/push-prompt';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SupportWidget } from '@/components/support/support-widget';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { Skeleton } from '@savspot/ui';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  const title = pageTitles[pathname] ?? '';

  // Sync sidebar collapsed state from localStorage
  useEffect(() => {
    const check = () => {
      setSidebarCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true');
    };
    check();
    window.addEventListener('storage', check);
    // Also poll briefly — the sidebar sets localStorage on click
    const interval = setInterval(check, 200);
    return () => {
      window.removeEventListener('storage', check);
      clearInterval(interval);
    };
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading skeleton while checking auth or redirecting to login
  if (isLoading || !isAuthenticated) {
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
      <div
        className="flex min-w-0 flex-1 flex-col transition-[padding] duration-200"
        style={{ paddingLeft: `var(--sidebar-width, 0px)` }}
      >
        <style>{`
          @media (min-width: 1024px) {
            :root { --sidebar-width: ${sidebarCollapsed ? '4rem' : '16rem'}; }
          }
        `}</style>
        <Header
          title={title}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <PushPrompt />
        <main className="min-w-0 flex-1 p-4 lg:p-6 max-w-[1600px] animate-in fade-in duration-150">
          {children}
        </main>
      </div>

      {/* Floating widgets */}
      <SupportWidget />
      <FeedbackWidget />
    </div>
  );
}
