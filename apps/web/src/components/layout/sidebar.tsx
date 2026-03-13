'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CreditCard,
  FileCheck,
  FileText,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  ScrollText,
  Upload,
  Users,
  Briefcase,
  Settings,
  Star,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@savspot/ui';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { TenantSwitcher } from '@/components/layout/tenant-switcher';

const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'Bookings', href: ROUTES.BOOKINGS, icon: CalendarCheck },
  { name: 'Calendar', href: ROUTES.CALENDAR, icon: Calendar },
  { name: 'Services', href: ROUTES.SERVICES, icon: Briefcase },
  { name: 'Payments', href: ROUTES.PAYMENTS, icon: CreditCard },
  { name: 'Clients', href: ROUTES.CLIENTS, icon: Users },
  { name: 'Analytics', href: ROUTES.ANALYTICS, icon: BarChart3 },
  { name: 'Invoices', href: ROUTES.INVOICES, icon: FileText },
  { name: 'Reviews', href: ROUTES.REVIEWS, icon: Star },
  { name: 'Quotes', href: ROUTES.QUOTES, icon: ScrollText },
  { name: 'Contracts', href: ROUTES.CONTRACTS, icon: FileCheck },
  { name: 'Messages', href: ROUTES.MESSAGES, icon: MessageSquare },
  { name: 'Imports', href: ROUTES.IMPORTS, icon: Upload },
  { name: 'Insights', href: ROUTES.INSIGHTS, icon: Lightbulb },
  { name: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <div
      className={cn(
        'flex h-full w-64 flex-col border-r bg-card',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href={ROUTES.DASHBOARD}
          className="font-heading text-xl font-bold tracking-tight"
          onClick={onNavigate}
        >
          SavSpot
        </Link>
      </div>

      {/* Tenant Switcher */}
      <TenantSwitcher />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150',
                isActive
                  ? 'bg-accent text-foreground border-l-2 border-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <Separator />
      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
