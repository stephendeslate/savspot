'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface AccountingConnection {
  id: string;
  provider: 'QUICKBOOKS' | 'XERO';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastSyncedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const PROVIDERS = [
  { key: 'QUICKBOOKS' as const, name: 'QuickBooks', description: 'Sync invoices and payments with QuickBooks' },
  { key: 'XERO' as const, name: 'Xero', description: 'Sync invoices and payments with Xero' },
];

// ---------- Helpers ----------

function getStatusBadge(status: AccountingConnection['status']) {
  switch (status) {
    case 'CONNECTED':
      return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
    case 'DISCONNECTED':
      return <Badge className="bg-gray-100 text-gray-800">Disconnected</Badge>;
    case 'ERROR':
      return <Badge className="bg-red-100 text-red-800">Error</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------- Component ----------

export default function AccountingSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [connections, setConnections] = useState<AccountingConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectingConnection, setDisconnectingConnection] = useState<AccountingConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<AccountingConnection[]>(
        `/api/tenants/${tenantId}/accounting/connections`,
      );
      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load accounting connections',
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
    void fetchConnections();
  }, [tenantId, fetchConnections]);

  const handleSync = async (connectionId: string) => {
    if (!tenantId) return;
    setSyncingId(connectionId);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/accounting/connections/${connectionId}/sync`,
      );
      setSuccess('Sync triggered successfully');
      await fetchConnections();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to trigger sync',
      );
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!tenantId || !disconnectingConnection) return;
    setDisconnecting(true);
    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/accounting/connections/${disconnectingConnection.id}`,
      );
      setDisconnectDialogOpen(false);
      setDisconnectingConnection(null);
      setSuccess('Account disconnected successfully');
      await fetchConnections();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect account',
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnect = (provider: string) => {
    if (!tenantId) return;
    window.open(
      `/api/tenants/${tenantId}/accounting/connect/${provider.toLowerCase()}`,
      '_blank',
    );
  };

  const getConnectionForProvider = (providerKey: 'QUICKBOOKS' | 'XERO') => {
    return connections.find((c) => c.provider === providerKey) ?? null;
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
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.SETTINGS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Accounting</h2>
          <p className="text-sm text-muted-foreground">
            Connect your accounting software for financial sync
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

      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const connection = getConnectionForProvider(provider.key);

          return (
            <Card key={provider.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                  {connection && getStatusBadge(connection.status)}
                </div>
              </CardHeader>
              <CardContent>
                {connection && connection.status !== 'DISCONNECTED' ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Last synced: {formatDate(connection.lastSyncedAt)}
                    </div>

                    {connection.errorMessage && (
                      <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                        {connection.errorMessage}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(connection.id)}
                        disabled={syncingId === connection.id}
                      >
                        {syncingId === connection.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          'Sync Now'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDisconnectingConnection(connection);
                          setDisconnectDialogOpen(true);
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(provider.key)}
                  >
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect{' '}
              <span className="font-semibold">
                {disconnectingConnection?.provider === 'QUICKBOOKS'
                  ? 'QuickBooks'
                  : 'Xero'}
              </span>
              ? Financial data will no longer sync automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDisconnectDialogOpen(false);
                setDisconnectingConnection(null);
              }}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? (
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
    </div>
  );
}
