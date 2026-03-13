'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Globe, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { ApiError, apiClient, isSubscriptionError, parseRequiredTier } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';
import { RequireRole } from '@/components/rbac/require-role';
import { UpgradeBanner } from '@/components/upgrade-banner';

// ---------- Types ----------

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

interface CustomDomain {
  id: string;
  domain: string;
  status: 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'FAILED';
  dnsRecords: DnsRecord[];
  createdAt: string;
  verifiedAt: string | null;
}

// ---------- Helpers ----------

function getStatusBadge(status: CustomDomain['status']) {
  switch (status) {
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'VERIFIED':
      return <Badge className="bg-blue-100 text-blue-800">Verified</Badge>;
    case 'ACTIVE':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------- Component ----------

export default function DomainsSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removingDomain, setRemovingDomain] = useState<CustomDomain | null>(null);
  const [removing, setRemoving] = useState(false);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<CustomDomain[]>(
        `/api/tenants/${tenantId}/custom-domains`,
      );
      setDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isSubscriptionError(err)) {
        setError(`__upgrade:${parseRequiredTier(err as ApiError) ?? 'Premium'}`);
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to load custom domains',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchDomains();
  }, [tenantId, fetchDomains]);

  const handleAddDomain = async () => {
    if (!tenantId) return;
    setFormError(null);

    const domain = newDomain.trim().toLowerCase();
    if (!domain) {
      setFormError('Domain name is required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(`/api/tenants/${tenantId}/custom-domains`, { domain });
      setAddDialogOpen(false);
      setNewDomain('');
      setSuccess('Domain added successfully');
      await fetchDomains();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      if (isSubscriptionError(err)) {
        setFormError('Custom domains require a Premium subscription or higher.');
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Failed to add domain',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    if (!tenantId) return;
    setVerifyingId(domainId);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/custom-domains/${domainId}/verify`,
      );
      setSuccess('DNS verification triggered');
      await fetchDomains();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      if (isSubscriptionError(err)) {
        setError('Custom domains require a Premium subscription or higher.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to verify domain',
        );
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRemove = async () => {
    if (!tenantId || !removingDomain) return;
    setRemoving(true);
    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/custom-domains/${removingDomain.id}`,
      );
      setRemoveDialogOpen(false);
      setRemovingDomain(null);
      setSuccess('Domain removed successfully');
      await fetchDomains();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      if (isSubscriptionError(err)) {
        setError('Custom domains require a Premium subscription or higher.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to remove domain',
        );
      }
    } finally {
      setRemoving(false);
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

  if (error?.startsWith('__upgrade:')) {
    const tier = error.replace('__upgrade:', '');
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
            <h2 className="text-lg font-semibold">Custom Domains</h2>
            <p className="text-sm text-muted-foreground">
              Use your own domain for your booking page
            </p>
          </div>
        </div>
        <UpgradeBanner requiredTier={tier} feature="Custom Domains" />
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <RequireRole minimum="ADMIN">
    <div className="space-y-6">
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
            <h2 className="text-lg font-semibold">Custom Domains</h2>
            <p className="text-sm text-muted-foreground">
              Use your own domain for your booking page
            </p>
          </div>
        </div>
        <Button onClick={() => {
          setNewDomain('');
          setFormError(null);
          setAddDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {domains.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No custom domains</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a domain to use your own URL for your booking page
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setNewDomain('');
                  setFormError(null);
                  setAddDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Domain
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-base">{domain.domain}</CardTitle>
                      <CardDescription>
                        Added {formatDate(domain.createdAt)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(domain.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setRemovingDomain(domain);
                        setRemoveDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {domain.status === 'PENDING' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add the following DNS records to verify ownership of this domain:
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {domain.dnsRecords.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">
                              {record.type}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {record.name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {record.value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(domain.id)}
                      disabled={verifyingId === domain.id}
                    >
                      {verifyingId === domain.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify DNS'
                      )}
                    </Button>
                  </div>
                )}

                {(domain.status === 'VERIFIED' || domain.status === 'ACTIVE') && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified {formatDate(domain.verifiedAt)}</span>
                  </div>
                )}

                {domain.status === 'FAILED' && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                      DNS verification failed. Please check your DNS records and try again.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(domain.id)}
                      disabled={verifyingId === domain.id}
                    >
                      {verifyingId === domain.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Retry Verification'
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Enter the domain you want to use for your booking page
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain-name">Domain</Label>
              <Input
                id="domain-name"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="booking.yourdomain.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Domain'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Domain</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold">{removingDomain?.domain}</span>?
              Your booking page will no longer be accessible at this domain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false);
                setRemovingDomain(null);
              }}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequireRole>
  );
}
