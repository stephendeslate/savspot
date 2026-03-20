'use client';

import { useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { Input } from '@savspot/ui';
import { collections } from '@/generated/helpContent';
import { ROUTES } from '@/lib/constants';

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.replace(/^\/help\/?/, '').split('/').filter(Boolean);

  const crumbs: { label: string; href: string }[] = [
    { label: 'Help Center', href: ROUTES.HELP },
  ];

  if (segments[0]) {
    const collection = collections.find((c) => c.id === segments[0]);
    crumbs.push({
      label: collection?.title ?? segments[0],
      href: `${ROUTES.HELP}/${segments[0]}`,
    });
  }

  // Article breadcrumb is just visual — no link needed for the current page
  // so we omit it from crumbs (the page title handles it)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1 && segments.length <= 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {isLast ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function HelpLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      router.push(`${ROUTES.HELP}/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs />
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </form>
      </div>
      {children}
    </div>
  );
}
