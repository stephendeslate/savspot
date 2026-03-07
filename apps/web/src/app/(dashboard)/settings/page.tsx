'use client';

import Link from 'next/link';
import {
  Bell,
  Building2,
  CalendarSync,
  ChevronRight,
  Clock,
  Code,
  CreditCard,
  Image,
  ListOrdered,
  Palette,
  Receipt,
  Tag,
  Users,
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
    name: 'Payments',
    description: 'Connect Stripe to accept online payments',
    href: '/settings/payments',
    icon: CreditCard,
  },
  {
    name: 'Calendar',
    description: 'Connect Google Calendar to sync availability and bookings',
    href: '/settings/calendar',
    icon: CalendarSync,
  },
  {
    name: 'Notifications',
    description: 'Configure email and push notification preferences',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    name: 'Branding',
    description: 'Customize your booking page appearance',
    href: '/settings/branding',
    icon: Palette,
  },
  {
    name: 'Discounts',
    description: 'Create and manage promo codes',
    href: '/settings/discounts',
    icon: Tag,
  },
  {
    name: 'Tax Rates',
    description: 'Manage tax rates for invoices',
    href: '/settings/tax-rates',
    icon: Receipt,
  },
  {
    name: 'Gallery',
    description: 'Manage photos for your booking page',
    href: '/settings/gallery',
    icon: Image,
  },
  {
    name: 'Team',
    description: 'Invite and manage team members',
    href: '/settings/team',
    icon: Users,
  },
  {
    name: 'Booking Flow',
    description: 'See which steps appear in your booking flow',
    href: '/settings/booking-flow',
    icon: ListOrdered,
  },
  {
    name: 'Embed Widget',
    description: 'Add a "Book Now" button to your website',
    href: '/settings/embed',
    icon: Code,
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
