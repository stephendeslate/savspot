'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft,
  Loader2,
  Plus,
  UserMinus,
  Users,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Badge, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

interface ServiceProvider {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ServiceData {
  id: string;
  name: string;
}

export default function ServiceProvidersPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params['id'] as string;
  const { tenantId } = useTenant();

  const [service, setService] = useState<ServiceData | null>(null);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<ServiceProvider | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchProviders = useCallback(async () => {
    if (!tenantId || !serviceId) return;

    try {
      const data = await apiClient.get<ServiceProvider[]>(
        `/api/tenants/${tenantId}/services/${serviceId}/providers`,
      );
      setProviders(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load providers',
      );
    }
  }, [tenantId, serviceId]);

  useEffect(() => {
    if (!tenantId || !serviceId) return;

    const fetchData = async () => {
      try {
        const [serviceData, providersData] = await Promise.all([
          apiClient.get<ServiceData>(
            `/api/tenants/${tenantId}/services/${serviceId}`,
          ),
          apiClient.get<ServiceProvider[]>(
            `/api/tenants/${tenantId}/services/${serviceId}/providers`,
          ),
        ]);
        setService(serviceData);
        setProviders(providersData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load service data',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [tenantId, serviceId]);

  const handleOpenAssignDialog = async () => {
    if (!tenantId) return;
    setIsAssignDialogOpen(true);
    setIsLoadingTeam(true);

    try {
      const data = await apiClient.get<TeamMember[]>(
        `/api/tenants/${tenantId}/team`,
      );
      setTeamMembers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load team members',
      );
      setIsAssignDialogOpen(false);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!tenantId) return;
    setIsAssigning(userId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/services/${serviceId}/providers`,
        { userId },
      );
      await fetchProviders();
      setSuccess('Provider assigned successfully');
      setIsAssignDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign provider',
      );
    } finally {
      setIsAssigning(null);
    }
  };

  const handleRemove = async () => {
    if (!tenantId || !removeTarget) return;
    setIsRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/services/${serviceId}/providers/${removeTarget.userId}`,
      );
      await fetchProviders();
      setSuccess('Provider removed successfully');
      setRemoveTarget(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove provider',
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const assignedUserIds = new Set(providers.map((p) => p.userId));
  const availableMembers = teamMembers.filter(
    (m) => !assignedUserIds.has(m.id),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/services/${serviceId}`)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Service Providers</h2>
            <p className="text-sm text-muted-foreground">
              {service?.name ?? 'Loading...'}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleOpenAssignDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Assign Provider
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Providers</CardTitle>
          <CardDescription>
            Staff members who can deliver this service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No providers assigned to this service yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Click &quot;Assign Provider&quot; to add staff members.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.userId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {provider.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{provider.role}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setRemoveTarget(provider)}
                    >
                      <UserMinus className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Provider Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Provider</DialogTitle>
            <DialogDescription>
              Select a team member to assign to this service.
            </DialogDescription>
          </DialogHeader>
          {isLoadingTeam ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : availableMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No available team members
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                All team members are already assigned to this service.
              </p>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {availableMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{member.role}</Badge>
                    <Button
                      size="sm"
                      disabled={isAssigning === member.id}
                      onClick={() => handleAssign(member.id)}
                    >
                      {isAssigning === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Assign'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-foreground">
                {removeTarget?.name}
              </span>{' '}
              from this service? They will no longer be able to deliver this
              service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
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
  );
}
