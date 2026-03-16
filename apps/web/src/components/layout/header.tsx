'use client';

import { Menu, Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@savspot/ui';
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
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Left: Mobile menu button + title */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}
      </div>

      {/* Right: Search hint + Theme + Notifications + User avatar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary sm:flex"
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-2 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">
            /
          </kbd>
        </button>
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
