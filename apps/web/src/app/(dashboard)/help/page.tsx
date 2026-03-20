'use client';

import Link from 'next/link';
import {
  Rocket,
  LayoutDashboard,
  CalendarCheck,
  Briefcase,
  Calendar,
  Users,
  CreditCard,
  UserCog,
  MessageSquare,
  Star,
  ScrollText,
  BarChart3,
  Settings,
  Workflow,
  Globe,
  BookOpen,
  Shield,
  Upload,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@savspot/ui';
import { collections } from '@/generated/helpContent';
import { ROUTES } from '@/lib/constants';

const COLLECTION_ICONS: Record<string, typeof Rocket> = {
  'getting-started': Rocket,
  'dashboard': LayoutDashboard,
  'booking-management': CalendarCheck,
  'services': Briefcase,
  'calendar-and-scheduling': Calendar,
  'clients': Users,
  'payments-and-invoices': CreditCard,
  'team-management': UserCog,
  'communications': MessageSquare,
  'reviews': Star,
  'quotes-and-contracts': ScrollText,
  'analytics-and-insights': BarChart3,
  'settings': Settings,
  'workflows-and-automation': Workflow,
  'client-portal': Globe,
  'booking-page': BookOpen,
  'data-and-privacy': Shield,
  'imports': Upload,
};

export default function HelpPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => {
        const Icon = COLLECTION_ICONS[collection.id] ?? BookOpen;
        return (
          <Link key={collection.id} href={`${ROUTES.HELP}/${collection.id}`}>
            <Card className="h-full transition-colors hover:bg-secondary/50">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{collection.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {collection.description}
                    </CardDescription>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {collection.articleCount} {collection.articleCount === 1 ? 'article' : 'articles'}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
