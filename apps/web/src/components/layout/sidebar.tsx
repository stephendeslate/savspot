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
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@savspot/ui';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { TenantSwitcher } from '@/components/layout/tenant-switcher';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Core',
    items: [
      { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { name: 'Bookings', href: ROUTES.BOOKINGS, icon: CalendarCheck },
      { name: 'Calendar', href: ROUTES.CALENDAR, icon: Calendar },
      { name: 'Services', href: ROUTES.SERVICES, icon: Briefcase },
    ],
  },
  {
    label: 'Business',
    items: [
      { name: 'Payments', href: ROUTES.PAYMENTS, icon: CreditCard },
      { name: 'Clients', href: ROUTES.CLIENTS, icon: Users },
      { name: 'Invoices', href: ROUTES.INVOICES, icon: FileText },
      { name: 'Analytics', href: ROUTES.ANALYTICS, icon: BarChart3 },
    ],
  },
  {
    label: 'Communication',
    items: [
      { name: 'Messages', href: ROUTES.MESSAGES, icon: MessageSquare },
      { name: 'Reviews', href: ROUTES.REVIEWS, icon: Star },
      { name: 'Quotes', href: ROUTES.QUOTES, icon: ScrollText },
      { name: 'Contracts', href: ROUTES.CONTRACTS, icon: FileCheck },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Imports', href: ROUTES.IMPORTS, icon: Upload },
      { name: 'Insights', href: ROUTES.INSIGHTS, icon: Lightbulb },
      { name: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
    ],
  },
];

const COLLAPSED_KEY = 'savspot-sidebar-collapsed';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex h-full flex-col border-r bg-card transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-64',
          className,
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center border-b px-3">
          {!collapsed && (
            <Link
              href={ROUTES.DASHBOARD}
              className="flex-1 pl-3 font-heading text-xl font-bold tracking-tight text-primary"
              onClick={onNavigate}
            >
              SavSpot
            </Link>
          )}
          {/* Hide collapse toggle on mobile (when onNavigate is set — mobile nav handles close) */}
          {!onNavigate && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Tenant Switcher */}
        {!collapsed && <TenantSwitcher />}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.label}>
              {sectionIndex > 0 && <Separator className="my-2" />}
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const linkContent = (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      {/* Active pill indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                      )}
                      <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'h-5 w-5')} />
                      {!collapsed && item.name}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <Separator />
        <div className="p-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/** Export collapsed state key for layout to read */
export { COLLAPSED_KEY };
