'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface VoiceConfig {
  enabled: boolean;
  phoneNumber: string | null;
  greetingMessage: string | null;
  afterHoursMessage: string | null;
  voicemailEnabled: boolean;
  recordCalls: boolean;
}

interface CallLog {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  callerNumber: string;
  status: string;
  duration: number;
  recordingUrl: string | null;
  createdAt: string;
}

// ---------- Defaults ----------

const defaultConfig: VoiceConfig = {
  enabled: false,
  phoneNumber: null,
  greetingMessage: null,
  afterHoursMessage: null,
  voicemailEnabled: false,
  recordCalls: false,
};

// ---------- Helpers ----------

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDirectionBadge(direction: 'INBOUND' | 'OUTBOUND') {
  if (direction === 'INBOUND') {
    return (
      <Badge className="bg-blue-100 text-blue-800">
        <PhoneIncoming className="mr-1 h-3 w-3" />
        Inbound
      </Badge>
    );
  }
  return (
    <Badge className="bg-purple-100 text-purple-800">
      <PhoneOutgoing className="mr-1 h-3 w-3" />
      Outbound
    </Badge>
  );
}

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'missed':
      return <Badge className="bg-red-100 text-red-800">Missed</Badge>;
    case 'voicemail':
      return <Badge className="bg-yellow-100 text-yellow-800">Voicemail</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ---------- Component ----------

export default function VoiceSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [config, setConfig] = useState<VoiceConfig>(defaultConfig);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      const [configData, logsData] = await Promise.all([
        apiClient.get<VoiceConfig>(`/api/tenants/${tenantId}/voice/config`),
        apiClient.get<CallLog[]>(`/api/tenants/${tenantId}/voice/call-logs`),
      ]);
      if (configData) {
        setConfig({ ...defaultConfig, ...configData });
      }
      if (Array.isArray(logsData)) {
        setCallLogs(logsData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load voice settings',
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
    void fetchData();
  }, [tenantId, fetchData]);

  const handleSave = async () => {
    if (!tenantId) return;

    setIsSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/api/tenants/${tenantId}/voice/config`, config);
      setSuccess('Voice settings saved successfully.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save voice settings',
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
              {Array.from({ length: 4 }).map((_, i) => (
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
          <h2 className="text-lg font-semibold">Voice &amp; Telephony</h2>
          <p className="text-sm text-muted-foreground">
            Manage phone system and call settings
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

      {/* Voice Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Phone className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Voice Configuration</CardTitle>
              <CardDescription>
                Configure your phone system settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Voice</p>
                <p className="text-xs text-muted-foreground">
                  Turn on telephony features for your business
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {config.phoneNumber && (
              <div>
                <p className="text-sm font-medium">Phone Number</p>
                <p className="text-sm text-muted-foreground">
                  {config.phoneNumber}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Voicemail</p>
                <p className="text-xs text-muted-foreground">
                  Allow callers to leave voicemail messages
                </p>
              </div>
              <Switch
                checked={config.voicemailEnabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, voicemailEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Record Calls</p>
                <p className="text-xs text-muted-foreground">
                  Automatically record all calls for quality assurance
                </p>
              </div>
              <Switch
                checked={config.recordCalls}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, recordCalls: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greeting-message">Greeting Message</Label>
              <Textarea
                id="greeting-message"
                value={config.greetingMessage ?? ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    greetingMessage: e.target.value || null,
                  }))
                }
                placeholder="Enter a greeting message for callers..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="after-hours-message">After Hours Message</Label>
              <Textarea
                id="after-hours-message"
                value={config.afterHoursMessage ?? ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    afterHoursMessage: e.target.value || null,
                  }))
                }
                placeholder="Enter a message for after-hours callers..."
                rows={3}
              />
            </div>
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
            'Save Settings'
          )}
        </Button>
      </div>

      {/* Call Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call Logs</CardTitle>
          <CardDescription>
            {callLogs.length === 0
              ? 'No call history yet.'
              : `${callLogs.length} call${callLogs.length !== 1 ? 's' : ''} recorded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Phone className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Call logs will appear here once you start receiving calls.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getDirectionBadge(log.direction)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.callerNumber}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(log.duration)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
