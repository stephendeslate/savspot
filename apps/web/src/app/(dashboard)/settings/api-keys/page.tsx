'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CreateApiKeyResponse {
  id: string;
  key: string;
  name: string;
}

interface CreateKeyFormData {
  name: string;
  expiresAt: string;
  scopes: string[];
}

const EMPTY_FORM: CreateKeyFormData = {
  name: '',
  expiresAt: '',
  scopes: [],
};

const AVAILABLE_SCOPES = [
  'bookings:read',
  'bookings:write',
  'clients:read',
  'clients:write',
  'services:read',
  'services:write',
  'payments:read',
  'reports:read',
];

// ---------- Helpers ----------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ---------- Component ----------

export default function ApiKeysPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateKeyFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [rotatingKey, setRotatingKey] = useState<ApiKey | null>(null);
  const [rotating, setRotating] = useState(false);

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<ApiKey[]>(
        `/api/tenants/${tenantId}/api-keys`,
      );
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load API keys',
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
    void fetchApiKeys();
  }, [tenantId, fetchApiKeys]);

  const openCreateDialog = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const updateField = <K extends keyof CreateKeyFormData>(
    field: K,
    value: CreateKeyFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleCreateKey = async () => {
    if (!tenantId) return;
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload: {
        name: string;
        scopes?: string[];
        expiresAt?: string;
      } = {
        name: formData.name.trim(),
      };
      if (formData.scopes.length > 0) {
        payload.scopes = formData.scopes;
      }
      if (formData.expiresAt) {
        payload.expiresAt = formData.expiresAt;
      }

      const result = await apiClient.post<CreateApiKeyResponse>(
        `/api/tenants/${tenantId}/api-keys`,
        payload,
      );

      setDialogOpen(false);
      setCreatedKey(result);
      setShowKeyDialog(true);
      setCopied(false);
      await fetchApiKeys();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create API key',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleRotate = async () => {
    if (!tenantId || !rotatingKey) return;
    setRotating(true);
    try {
      const result = await apiClient.post<CreateApiKeyResponse>(
        `/api/tenants/${tenantId}/api-keys/${rotatingKey.id}/rotate`,
      );
      setRotateDialogOpen(false);
      setRotatingKey(null);
      setCreatedKey(result);
      setShowKeyDialog(true);
      setCopied(false);
      await fetchApiKeys();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to rotate API key',
      );
    } finally {
      setRotating(false);
    }
  };

  const handleRevoke = async () => {
    if (!tenantId || !revokingKey) return;
    setRevoking(true);
    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/api-keys/${revokingKey.id}`,
      );
      setRevokeDialogOpen(false);
      setRevokingKey(null);
      setSuccess('API key revoked');
      await fetchApiKeys();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to revoke API key',
      );
    } finally {
      setRevoking(false);
    }
  };

  useEffect(() => {
    if (!openActionId) return;
    const handleClick = () => setOpenActionId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openActionId]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(ROUTES.SETTINGS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Manage API keys for integrations
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
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

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length === 0
              ? 'No API keys created yet. Create one to integrate with external services.'
              : `${apiKeys.length} API key${apiKeys.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Create your first API key to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => {
                  const expired = isExpired(key.expiresAt);
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        {key.name}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-muted-foreground">
                          {key.keyPrefix}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.length > 0 ? (
                            key.scopes.map((scope) => (
                              <Badge
                                key={scope}
                                className="bg-blue-100 text-blue-800"
                              >
                                {scope}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              All
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(key.lastUsedAt)}
                      </TableCell>
                      <TableCell>
                        {key.expiresAt ? (
                          expired ? (
                            <Badge className="bg-red-100 text-red-800">
                              Expired
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(key.expiresAt)}
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Never
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(key.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId(
                                openActionId === key.id ? null : key.id,
                              );
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {openActionId === key.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                onClick={() => {
                                  setRotatingKey(key);
                                  setRotateDialogOpen(true);
                                  setOpenActionId(null);
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Rotate
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                onClick={() => {
                                  setRevokingKey(key);
                                  setRevokeDialogOpen(true);
                                  setOpenActionId(null);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Revoke
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for external integrations
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Production API Key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-expires">Expiration (optional)</Label>
              <Input
                id="key-expires"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => updateField('expiresAt', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Scopes (optional, leave empty for full access)</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Make sure to copy your API key now. You will not be able to
                  see it again after closing this dialog.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdKey?.key ?? ''}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                >
                  {copied ? (
                    'Copied!'
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Confirmation Dialog */}
      <Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to rotate the API key{' '}
              <span className="font-semibold">{rotatingKey?.name}</span>? The
              current key will be invalidated immediately and a new key will
              be generated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRotateDialogOpen(false);
                setRotatingKey(null);
              }}
              disabled={rotating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRotate}
              disabled={rotating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rotating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rotating...
                </>
              ) : (
                'Rotate Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the API key{' '}
              <span className="font-semibold">{revokingKey?.name}</span>? Any
              integrations using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeDialogOpen(false);
                setRevokingKey(null);
              }}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
