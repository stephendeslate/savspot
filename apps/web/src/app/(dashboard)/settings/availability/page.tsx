'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/rbac/require-role';

interface AvailabilityRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

function getDayLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ?? 'Unknown';
}

/**
 * Format a time string for display. Handles both "HH:mm" and ISO datetime strings.
 * Returns 12-hour format with AM/PM (e.g., "9:00 AM").
 */
function formatTimeDisplay(time: string): string {
  let hours: number;
  let minutes: string;

  if (time.includes('T')) {
    // ISO datetime string (e.g., "1970-01-01T09:00:00.000Z")
    const date = new Date(time);
    hours = date.getUTCHours();
    minutes = date.getUTCMinutes().toString().padStart(2, '0');
  } else {
    // "HH:mm" format
    const [hoursStr, minutesStr] = time.split(':');
    hours = parseInt(hoursStr ?? '0', 10);
    minutes = minutesStr ?? '00';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

export default function AvailabilityPage() {
  const { tenantId } = useTenant();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New rule form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [isSaving, setIsSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<AvailabilityRule[]>(
        `/api/tenants/${tenantId}/availability-rules`,
      );
      setRules(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load availability rules',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchRules();
  }, [tenantId, fetchRules]);

  const handleAddRule = async () => {
    if (!tenantId) return;
    setIsSaving(true);
    setError(null);

    try {
      await apiClient.post(`/api/tenants/${tenantId}/availability-rules`, {
        dayOfWeek: newDay,
        startTime: newStart,
        endTime: newEnd,
        isActive: true,
      });
      setShowAddForm(false);
      setNewDay(1);
      setNewStart('09:00');
      setNewEnd('17:00');
      await fetchRules();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add rule',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (ruleId: string, currentActive: boolean) => {
    if (!tenantId) return;

    try {
      await apiClient.patch(
        `/api/tenants/${tenantId}/availability-rules/${ruleId}`,
        { isActive: !currentActive },
      );
      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, isActive: !currentActive } : r,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update rule',
      );
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!tenantId) return;

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/availability-rules/${ruleId}`,
      );
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete rule',
      );
    }
  };

  // Sort rules by day of week then start time
  const sortedRules = [...rules].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
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
          Please complete onboarding to manage availability.
        </p>
      </div>
    );
  }

  return (
    <RequireRole minimum="ADMIN">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Availability Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Set your weekly working hours. Clients can only book during these
            times.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add rule form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Availability Rule</CardTitle>
            <CardDescription>
              Define when you are available for bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={newDay.toString()}
                  onValueChange={(v) => setNewDay(parseInt(v, 10))}
                >
                  <SelectTrigger id="day" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleAddRule}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
          <CardDescription>
            Your current availability rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium">No availability rules</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add availability rules to let clients know when you are
                available for bookings.
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first rule
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-5 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
                <div>Day</div>
                <div>Start Time</div>
                <div>End Time</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {sortedRules.map((rule) => (
                <div
                  key={rule.id}
                  className="grid grid-cols-5 items-center gap-4 rounded-md border px-3 py-3"
                >
                  <div className="font-medium">
                    {getDayLabel(rule.dayOfWeek)}
                  </div>
                  <div className="text-sm">{formatTimeDisplay(rule.startTime)}</div>
                  <div className="text-sm">{formatTimeDisplay(rule.endTime)}</div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleToggle(rule.id, rule.isActive)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RequireRole>
  );
}
