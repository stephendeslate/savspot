'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, CalendarCheck, CreditCard, CalendarSync, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ROUTES } from '@/lib/constants';

// ---------- Types ----------

interface NotificationChannel {
  email: boolean;
  push: boolean;
}

interface NotificationPreferences {
  BOOKING: NotificationChannel;
  PAYMENT: NotificationChannel;
  SYSTEM: NotificationChannel;
  CALENDAR: NotificationChannel;
}

const CATEGORIES = [
  {
    key: 'BOOKING' as const,
    label: 'Booking Notifications',
    description: 'New bookings, cancellations, and reschedules',
    icon: CalendarCheck,
  },
  {
    key: 'PAYMENT' as const,
    label: 'Payment Notifications',
    description: 'Payment received, refunds, and failed charges',
    icon: CreditCard,
  },
  {
    key: 'SYSTEM' as const,
    label: 'System Notifications',
    description: 'Account updates, security alerts, and maintenance',
    icon: AlertCircle,
  },
  {
    key: 'CALENDAR' as const,
    label: 'Calendar Notifications',
    description: 'Calendar sync status and conflict alerts',
    icon: CalendarSync,
  },
];

// ---------- Component ----------

export default function NotificationPreferencesPage() {
  const router = useRouter();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    BOOKING: { email: true, push: true },
    PAYMENT: { email: true, push: true },
    SYSTEM: { email: true, push: false },
    CALENDAR: { email: false, push: true },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleToggle = (
    category: keyof NotificationPreferences,
    channel: keyof NotificationChannel,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: !prev[category][channel],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // API not ready yet — simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
    setSuccessMessage('Preferences saved. Note: Full notification preferences are coming soon.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.SETTINGS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Choose how and when you receive notifications
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <div className="rounded-md bg-muted p-3">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Browser push notifications require your browser&apos;s permission.
            You will be prompted when you enable push for the first time.
          </p>
        </div>
      </div>

      {/* Category Cards */}
      {CATEGORIES.map((category) => {
        const prefs = preferences[category.key];
        return (
          <Card key={category.key}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{category.label}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Email Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={prefs.email}
                    onChange={() => handleToggle(category.key, 'email')}
                  />
                </div>

                <Separator />

                {/* Push Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Browser Push</p>
                    <p className="text-xs text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={prefs.push}
                    onChange={() => handleToggle(category.key, 'push')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-primary' : 'bg-muted-foreground/25'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
