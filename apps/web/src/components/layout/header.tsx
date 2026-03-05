'use client';

import { Menu } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/notification-bell';
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

      {/* Right: Notifications + User avatar */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="hidden text-sm text-muted-foreground sm:block">
          {displayName}
        </span>
        <Avatar
          src={user?.avatarUrl}
          alt={displayName}
          className="h-8 w-8"
        />
      </div>
    </header>
  );
}
