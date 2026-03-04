'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';

const NAV_LINKS = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/portal/payments', label: 'Payments', icon: CreditCard },
  { href: '/portal/profile', label: 'Profile', icon: User },
] as const;

export function PortalNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActiveLink = (href: string) => {
    if (href === '/portal') {
      return pathname === '/portal';
    }
    return pathname.startsWith(href);
  };

  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : 'User';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/portal" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-lg font-semibold">SavSpot</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActiveLink(link.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop user menu */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2">
            <Avatar
              src={user?.avatarUrl}
              alt={fullName}
              className="h-8 w-8"
            />
            <span className="text-sm font-medium">{fullName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 pb-4 pt-2 sm:px-6">
            {/* User info */}
            <div className="flex items-center gap-3 border-b pb-3 mb-2">
              <Avatar
                src={user?.avatarUrl}
                alt={fullName}
                className="h-9 w-9"
              />
              <div>
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Navigation links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActiveLink(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}

            {/* Settings link */}
            <Link
              href="/portal/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === '/portal/settings'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" />
              Settings
            </Link>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
