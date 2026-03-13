'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarSync,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Skeleton, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface CalendarConnection {
  id: string;
  provider: string;
  accountEmail: string | null;
  status: 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
  errorMessage: string | null;
  syncDirection: 'OUTBOUND' | 'BIDIRECTIONAL';
  syncFrequencyMinutes: number;
  lastSyncedAt: string | null;
  createdAt: string;
}

interface ExternalCalendar {
  id: string;
  externalCalendarId: string;
  name: string;
  isPrimary: boolean;
  isSelected: boolean;
}

// ---------- Component ----------

export default function CalendarSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const connection = connections[0] ?? null;

  const fetchConnections = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<CalendarConnection[]>(
        `/api/tenants/${tenantId}/calendar/connections`,
      );
      setConnections(data);
    } catch {
      // No connections yet — that's fine
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const fetchCalendars = useCallback(async (connId: string) => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<ExternalCalendar[]>(
        `/api/tenants/${tenantId}/calendar/connections/${connId}/calendars`,
      );
      setCalendars(data);
    } catch {
      setCalendars([]);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchConnections();
  }, [tenantId, fetchConnections]);

  useEffect(() => {
    if (connection) {
      void fetchCalendars(connection.id);
    }
  }, [connection, fetchCalendars]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleConnect = async () => {
    if (!tenantId) return;
    setConnectLoading(true);
    setError(null);

    try {
      const data = await apiClient.post<{ authUrl: string }>(
        `/api/tenants/${tenantId}/calendar/connect`,
      );
      const url = new URL(data.authUrl);
      const allowedHosts = ['accounts.google.com', 'login.microsoftonline.com', 'login.live.com'];
      if (!allowedHosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) {
        throw new Error('Invalid redirect URL');
      }
      window.location.href = data.authUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start Google Calendar connection',
      );
      setConnectLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!tenantId || !connection) return;
    setSyncLoading(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/calendar/connections/${connection.id}/sync`,
      );
      showSuccess('Calendar sync started successfully');
      await fetchConnections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sync calendar',
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!tenantId || !connection) return;
    setDisconnectLoading(true);
    setError(null);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/calendar/connections/${connection.id}`,
      );
      setConnections([]);
      setCalendars([]);
      setShowDisconnectDialog(false);
      showSuccess('Google Calendar disconnected');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to disconnect calendar',
      );
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleUpdateSettings = async (
    updates: Partial<Pick<CalendarConnection, 'syncDirection' | 'syncFrequencyMinutes'>>,
  ) => {
    if (!tenantId || !connection) return;
    setSavingSettings(true);
    setError(null);

    try {
      const updated = await apiClient.patch<CalendarConnection>(
        `/api/tenants/${tenantId}/calendar/connections/${connection.id}`,
        updates,
      );
      setConnections([updated]);
      showSuccess('Settings saved');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update settings',
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleCalendar = async (cal: ExternalCalendar) => {
    if (!tenantId || !connection) return;

    try {
      await apiClient.patch(
        `/api/tenants/${tenantId}/calendar/connections/${connection.id}/calendars`,
        {
          calendarId: cal.id,
          isSelected: !cal.isSelected,
        },
      );
      setCalendars((prev) =>
        prev.map((c) =>
          c.id === cal.id ? { ...c, isSelected: !c.isSelected } : c,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update calendar',
      );
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
          <h2 className="text-lg font-semibold">Calendar Settings</h2>
          <p className="text-sm text-muted-foreground">
            Connect Google Calendar to sync your availability and bookings
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {/* Not Connected */}
      {!connection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Connect Google Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarSync className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm">
                    Connect your Google Calendar to automatically sync your
                    bookings and block off busy times. This helps prevent
                    double-bookings and keeps your schedule up to date across
                    platforms.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Benefits:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Automatically block busy times from personal calendar
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Push new bookings to your Google Calendar
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Prevent double-bookings across all calendars
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Two-way sync keeps everything in one place
                  </li>
                </ul>
              </div>

              <Separator />

              <Button
                onClick={handleConnect}
                disabled={connectLoading}
                className="w-full sm:w-auto"
              >
                {connectLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CalendarSync className="mr-2 h-4 w-4" />
                    Connect Google Calendar
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                You will be redirected to Google to authorize access. We only
                request permission to read and write calendar events.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected */}
      {connection && (
        <>
          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">
                  Google Calendar
                </CardTitle>
                {connection.status === 'ACTIVE' ? (
                  <Badge className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    Error
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connection.accountEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-medium">{connection.accountEmail}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Last synced:</span>
                  <span className="font-medium">
                    {connection.lastSyncedAt
                      ? formatDistanceToNow(new Date(connection.lastSyncedAt), {
                          addSuffix: true,
                        })
                      : 'Never'}
                  </span>
                </div>

                {connection.status === 'ERROR' && connection.errorMessage && (
                  <div className="space-y-3">
                    <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                      <p className="text-sm text-destructive">
                        {connection.errorMessage}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleConnect}
                      disabled={connectLoading}
                    >
                      {connectLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reconnecting...
                        </>
                      ) : (
                        <>
                          <CalendarSync className="mr-2 h-4 w-4" />
                          Reconnect Google Calendar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sync Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Settings</CardTitle>
              <CardDescription>
                Configure how your calendar syncs with SavSpot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="syncDirection">Sync Direction</Label>
                    <Select
                      value={connection.syncDirection}
                      onValueChange={(v) =>
                        handleUpdateSettings({
                          syncDirection: v as
                            | 'OUTBOUND'
                            | 'BIDIRECTIONAL',
                        })
                      }
                    >
                      <SelectTrigger id="syncDirection" className="w-full" disabled={savingSettings}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTBOUND">
                          One-way (outbound only)
                        </SelectItem>
                        <SelectItem value="BIDIRECTIONAL">
                          Two-way (outbound + inbound blocking)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {connection.syncDirection === 'OUTBOUND'
                        ? 'Bookings are pushed to Google Calendar. External events do not block availability.'
                        : 'Bookings are pushed to Google Calendar and external events block your availability.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="syncFrequency">Sync Frequency</Label>
                    <Select
                      value={connection.syncFrequencyMinutes.toString()}
                      onValueChange={(v) =>
                        handleUpdateSettings({
                          syncFrequencyMinutes: parseInt(v, 10),
                        })
                      }
                    >
                      <SelectTrigger id="syncFrequency" className="w-full" disabled={savingSettings}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="10">Every 10 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How often SavSpot checks for changes in your calendar
                    </p>
                  </div>
                </div>

                {savingSettings && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Calendars Card */}
          {calendars.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Selected Calendars
                </CardTitle>
                <CardDescription>
                  Choose which calendars to sync with SavSpot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calendars.map((cal) => (
                    <label
                      key={cal.id}
                      className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={cal.isSelected}
                        onChange={() => handleToggleCalendar(cal)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {cal.name}
                        </span>
                        {cal.isPrimary && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={handleSyncNow}
                  disabled={syncLoading}
                >
                  {syncLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDisconnectDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Disconnect Confirmation Dialog */}
          <Dialog
            open={showDisconnectDialog}
            onOpenChange={setShowDisconnectDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disconnect Google Calendar</DialogTitle>
                <DialogDescription>
                  Are you sure you want to disconnect your Google Calendar?
                  This will stop syncing your bookings and availability.
                  Existing bookings will not be affected.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDisconnectDialog(false)}
                  disabled={disconnectLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDisconnect}
                  disabled={disconnectLoading}
                >
                  {disconnectLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
