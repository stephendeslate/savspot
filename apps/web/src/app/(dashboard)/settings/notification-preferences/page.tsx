'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Mail, Smartphone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface NotificationPreferences {
  emailBookingConfirmation: boolean;
  emailBookingReminder: boolean;
  emailBookingCancellation: boolean;
  emailPaymentReceived: boolean;
  emailReviewReceived: boolean;
  pushNewBooking: boolean;
  pushCancellation: boolean;
  pushPayment: boolean;
  smsReminder: boolean;
}

interface DigestSettings {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY';
  time: string;
  dayOfWeek: number | null;
}

// ---------- Defaults ----------

const defaultPreferences: NotificationPreferences = {
  emailBookingConfirmation: true,
  emailBookingReminder: true,
  emailBookingCancellation: true,
  emailPaymentReceived: true,
  emailReviewReceived: true,
  pushNewBooking: true,
  pushCancellation: true,
  pushPayment: true,
  smsReminder: false,
};

const defaultDigest: DigestSettings = {
  enabled: false,
  frequency: 'DAILY',
  time: '09:00',
  dayOfWeek: null,
};

const EMAIL_TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'emailBookingConfirmation', label: 'Booking Confirmation', description: 'When a new booking is confirmed' },
  { key: 'emailBookingReminder', label: 'Booking Reminder', description: 'Upcoming booking reminders' },
  { key: 'emailBookingCancellation', label: 'Booking Cancellation', description: 'When a booking is cancelled' },
  { key: 'emailPaymentReceived', label: 'Payment Received', description: 'When a payment is processed' },
  { key: 'emailReviewReceived', label: 'Review Received', description: 'When a client leaves a review' },
];

const PUSH_TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'pushNewBooking', label: 'New Booking', description: 'Push alert for new bookings' },
  { key: 'pushCancellation', label: 'Cancellation', description: 'Push alert for cancellations' },
  { key: 'pushPayment', label: 'Payment', description: 'Push alert for payments' },
];

const SMS_TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'smsReminder', label: 'SMS Reminder', description: 'Send SMS reminders to clients' },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

// ---------- Component ----------

export default function NotificationPreferencesSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [digest, setDigest] = useState<DigestSettings>(defaultDigest);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      const [prefsData, digestData] = await Promise.all([
        apiClient.get<NotificationPreferences>(
          `/api/tenants/${tenantId}/notification-preferences`,
        ),
        apiClient.get<DigestSettings>(
          `/api/tenants/${tenantId}/notification-preferences/digest`,
        ),
      ]);
      if (prefsData) {
        setPreferences({ ...defaultPreferences, ...prefsData });
      }
      if (digestData) {
        setDigest({ ...defaultDigest, ...digestData });
      }
    } catch {
      // Use defaults on error
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [tenantId, fetchData]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        apiClient.request(`/api/tenants/${tenantId}/notification-preferences`, {
          method: 'PUT',
          body: JSON.stringify(preferences),
        }),
        apiClient.request(`/api/tenants/${tenantId}/notification-preferences/digest`, {
          method: 'PUT',
          body: JSON.stringify(digest),
        }),
      ]);
      setSuccess('Preferences saved successfully.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preferences',
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-medium">No business found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please complete onboarding to set up your business.
        </p>
      </div>
    );
  }

  // ---------- Render ----------

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
            Configure notification channels and digest settings
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Email Notifications</CardTitle>
              <CardDescription>Notifications sent via email</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {EMAIL_TOGGLES.map((toggle, idx) => (
              <div key={toggle.key}>
                {idx > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {toggle.description}
                    </p>
                  </div>
                  <Switch
                    checked={preferences[toggle.key]}
                    onCheckedChange={() => handleToggle(toggle.key)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription>Browser and mobile push alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {PUSH_TOGGLES.map((toggle, idx) => (
              <div key={toggle.key}>
                {idx > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {toggle.description}
                    </p>
                  </div>
                  <Switch
                    checked={preferences[toggle.key]}
                    onCheckedChange={() => handleToggle(toggle.key)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">SMS Notifications</CardTitle>
              <CardDescription>Text message notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {SMS_TOGGLES.map((toggle, idx) => (
              <div key={toggle.key}>
                {idx > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {toggle.description}
                    </p>
                  </div>
                  <Switch
                    checked={preferences[toggle.key]}
                    onCheckedChange={() => handleToggle(toggle.key)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Digest Settings</CardTitle>
          <CardDescription>
            Receive a summary of notifications instead of individual alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Digest</p>
                <p className="text-xs text-muted-foreground">
                  Bundle notifications into a periodic summary
                </p>
              </div>
              <Switch
                checked={digest.enabled}
                onCheckedChange={(checked) =>
                  setDigest((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {digest.enabled && (
              <>
                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="digest-frequency">Frequency</Label>
                  <Select
                    value={digest.frequency}
                    onValueChange={(v) =>
                      setDigest((prev) => ({
                        ...prev,
                        frequency: v as 'DAILY' | 'WEEKLY',
                        dayOfWeek: v === 'DAILY' ? null : prev.dayOfWeek ?? 1,
                      }))
                    }
                  >
                    <SelectTrigger id="digest-frequency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="digest-time">Time</Label>
                  <Input
                    id="digest-time"
                    type="time"
                    value={digest.time}
                    onChange={(e) =>
                      setDigest((prev) => ({ ...prev, time: e.target.value }))
                    }
                  />
                </div>

                {digest.frequency === 'WEEKLY' && (
                  <div className="space-y-2">
                    <Label htmlFor="digest-day">Day of Week</Label>
                    <Select
                      value={digest.dayOfWeek?.toString() ?? '1'}
                      onValueChange={(v) =>
                        setDigest((prev) => ({
                          ...prev,
                          dayOfWeek: parseInt(v, 10),
                        }))
                      }
                    >
                      <SelectTrigger id="digest-day" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OF_WEEK_OPTIONS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

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
