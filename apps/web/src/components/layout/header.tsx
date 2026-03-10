'use client';

import { Menu } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/use-auth';

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  const displayName = user ? user.name : 'Loading...';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      {/* Left: Mobile menu button + title */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}
      </div>

      {/* Right: Theme + Notifications + User avatar */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationBell />
        <span className="hidden text-sm text-muted-foreground sm:block">
          {displayName}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>
            {displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
