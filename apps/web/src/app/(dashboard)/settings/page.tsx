'use client';

import Link from 'next/link';
import {
  Building2,
  Bell,
  CreditCard,
  Palette,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const settingsSections = [
  {
    name: 'Business Profile',
    description: 'Update your business information and branding',
    href: '/settings/profile',
    icon: Building2,
  },
  {
    name: 'Availability',
    description: 'Set your weekly working hours and schedule',
    href: '/settings/availability',
    icon: Clock,
  },
  {
    name: 'Notifications',
    description: 'Configure email and push notification preferences',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    name: 'Billing',
    description: 'Manage your subscription and payment methods',
    href: '/settings/billing',
    icon: CreditCard,
  },
  {
    name: 'Appearance',
    description: 'Customize your booking page theme and colors',
    href: '/settings/appearance',
    icon: Palette,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account and business settings
        </p>
      </div>

      <div className="grid gap-4">
        {settingsSections.map((section) => (
          <Link key={section.name} href={section.href}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <section.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{section.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
