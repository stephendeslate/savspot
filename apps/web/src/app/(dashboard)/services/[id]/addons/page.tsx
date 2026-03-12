'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Switch, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  durationMinutes: number | null;
  isActive: boolean;
  createdAt: string;
}

interface AddonFormData {
  name: string;
  price: string;
  durationMinutes: string;
  isActive: boolean;
}

const EMPTY_FORM: AddonFormData = {
  name: '',
  price: '',
  durationMinutes: '',
  isActive: true,
};

// ---------- Helpers ----------

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '\u2014';
  return `${minutes} min`;
}

// ---------- Component ----------

export default function ServiceAddonsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params['id'] as string;
  const { tenantId } = useTenant();

  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [formData, setFormData] = useState<AddonFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingAddon, setDeactivatingAddon] = useState<ServiceAddon | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Actions dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch addons
  const fetchAddons = useCallback(async () => {
    if (!tenantId || !serviceId) return;

    try {
      const data = await apiClient.get<ServiceAddon[]>(
        `/api/tenants/${tenantId}/services/${serviceId}/addons`,
      );
      setAddons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load add-ons',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, serviceId]);

  useEffect(() => {
    if (!tenantId || !serviceId) {
      setIsLoading(false);
      return;
    }
    void fetchAddons();
  }, [tenantId, serviceId, fetchAddons]);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingAddon(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (addon: ServiceAddon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      price: addon.price.toString(),
      durationMinutes: addon.durationMinutes?.toString() ?? '',
      isActive: addon.isActive,
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  // Handle form field changes
  const updateField = <K extends keyof AddonFormData>(
    field: K,
    value: AddonFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Submit form (create or update)
  const handleSubmitForm = async () => {
    if (!tenantId || !serviceId) return;
    setFormError(null);

    const name = formData.name.trim();
    if (!name) {
      setFormError('Add-on name is required');
      return;
    }

    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Price must be a non-negative number');
      return;
    }

    const durationMinutes = formData.durationMinutes
      ? parseInt(formData.durationMinutes, 10)
      : null;
    if (durationMinutes !== null && (isNaN(durationMinutes) || durationMinutes < 0)) {
      setFormError('Duration must be a non-negative number');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        price: numPrice,
        durationMinutes,
        isActive: formData.isActive,
      };

      if (editingAddon) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/services/${serviceId}/addons/${editingAddon.id}`,
          payload,
        );
        setSuccess('Add-on updated successfully');
      } else {
        await apiClient.post(
          `/api/tenants/${tenantId}/services/${serviceId}/addons`,
          payload,
        );
        setSuccess('Add-on created successfully');
      }

      setDialogOpen(false);
      await fetchAddons();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save add-on',
      );
    } finally {
      setSaving(false);
    }
  };

  // Deactivate addon
  const handleDeactivate = async () => {
    if (!tenantId || !serviceId || !deactivatingAddon) return;
    setDeactivating(true);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/services/${serviceId}/addons/${deactivatingAddon.id}`,
      );
      setDeactivateDialogOpen(false);
      setDeactivatingAddon(null);
      setSuccess('Add-on deactivated successfully');
      await fetchAddons();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to deactivate add-on',
      );
    } finally {
      setDeactivating(false);
    }
  };

  // Close actions dropdown when clicking outside
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
            onClick={() => router.push(`/services/${serviceId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Service Add-ons</h2>
            <p className="text-sm text-muted-foreground">
              Manage optional add-ons for this service
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Add-on
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

      {/* Add-ons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add-ons</CardTitle>
          <CardDescription>
            {addons.length === 0
              ? 'No add-ons created yet. Create one to offer extras to your clients.'
              : `${addons.length} add-on${addons.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {addons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Create your first add-on to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Add-on
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>
                      <span className="font-medium">{addon.name}</span>
                    </TableCell>
                    <TableCell>{formatCurrency(addon.price)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(addon.durationMinutes)}
                    </TableCell>
                    <TableCell>
                      {addon.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(
                              openActionId === addon.id
                                ? null
                                : addon.id,
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {openActionId === addon.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                              onClick={() => openEditDialog(addon)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {addon.isActive && (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                onClick={() => {
                                  setDeactivatingAddon(addon);
                                  setDeactivateDialogOpen(true);
                                  setOpenActionId(null);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddon ? 'Edit Add-on' : 'Create Add-on'}
            </DialogTitle>
            <DialogDescription>
              {editingAddon
                ? 'Update the add-on details below'
                : 'Set up a new optional add-on for this service'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="addon-name">Name</Label>
              <Input
                id="addon-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Deep Conditioning Treatment"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="addon-price">Price ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="addon-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  placeholder="e.g., 15.00"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="addon-duration">
                Duration in minutes (optional)
              </Label>
              <Input
                id="addon-duration"
                type="number"
                min="0"
                value={formData.durationMinutes}
                onChange={(e) =>
                  updateField('durationMinutes', e.target.value)
                }
                placeholder="Leave empty if no extra time"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="addon-active">Active</Label>
              <Switch
                id="addon-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  updateField('isActive', checked)
                }
              />
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
            <Button onClick={handleSubmitForm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingAddon ? 'Updating...' : 'Creating...'}
                </>
              ) : editingAddon ? (
                'Update Add-on'
              ) : (
                'Create Add-on'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Add-on</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-semibold">
                {deactivatingAddon?.name}
              </span>
              ? Clients will no longer be able to select this add-on.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false);
                setDeactivatingAddon(null);
              }}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
