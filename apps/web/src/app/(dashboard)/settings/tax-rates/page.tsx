'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  region: string | null;
  isInclusive: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface TaxRateFormData {
  name: string;
  rate: string;
  region: string;
  isInclusive: boolean;
  isDefault: boolean;
}

const EMPTY_FORM: TaxRateFormData = {
  name: '',
  rate: '',
  region: '',
  isInclusive: false,
  isDefault: false,
};

// ---------- Component ----------

export default function TaxRatesPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState<TaxRateFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingRate, setDeactivatingRate] = useState<TaxRate | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const fetchTaxRates = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<TaxRate[]>(
        `/api/tenants/${tenantId}/tax-rates`,
      );
      setTaxRates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load tax rates',
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
    void fetchTaxRates();
  }, [tenantId, fetchTaxRates]);

  const openCreateDialog = () => {
    setEditingRate(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (rate: TaxRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      rate: rate.rate.toString(),
      region: rate.region || '',
      isInclusive: rate.isInclusive,
      isDefault: rate.isDefault,
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  const updateField = <K extends keyof TaxRateFormData>(
    field: K,
    value: TaxRateFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    const numRate = parseFloat(formData.rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      setFormError('Rate must be between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        rate: numRate,
        region: formData.region.trim() || undefined,
        isInclusive: formData.isInclusive,
        isDefault: formData.isDefault,
      };

      if (editingRate) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/tax-rates/${editingRate.id}`,
          payload,
        );
        setSuccess('Tax rate updated');
      } else {
        await apiClient.post(`/api/tenants/${tenantId}/tax-rates`, payload);
        setSuccess('Tax rate created');
      }

      setDialogOpen(false);
      await fetchTaxRates();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save tax rate',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!tenantId || !deactivatingRate) return;
    setDeactivating(true);
    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/tax-rates/${deactivatingRate.id}`,
      );
      setDeactivateDialogOpen(false);
      setDeactivatingRate(null);
      setSuccess('Tax rate deactivated');
      await fetchTaxRates();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to deactivate tax rate',
      );
    } finally {
      setDeactivating(false);
    }
  };

  useEffect(() => {
    if (!openActionId) return;
    const handleClick = () => setOpenActionId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openActionId]);

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

  return (
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
            <h2 className="text-lg font-semibold">Tax Rates</h2>
            <p className="text-sm text-muted-foreground">
              Manage tax rates applied to your invoices
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tax Rate
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Rates</CardTitle>
          <CardDescription>
            {taxRates.length === 0
              ? 'No tax rates configured yet.'
              : `${taxRates.length} tax rate${taxRates.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {taxRates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Add your first tax rate to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Tax Rate
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Inclusive</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.name}</TableCell>
                    <TableCell>{rate.rate}%</TableCell>
                    <TableCell className="text-muted-foreground">
                      {rate.region || '-'}
                    </TableCell>
                    <TableCell>
                      {rate.isInclusive ? (
                        <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rate.isDefault ? (
                        <Badge className="bg-green-100 text-green-800">Default</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rate.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
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
                              openActionId === rate.id ? null : rate.id,
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {openActionId === rate.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                              onClick={() => openEditDialog(rate)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {rate.isActive && (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                onClick={() => {
                                  setDeactivatingRate(rate);
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
              {editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}
            </DialogTitle>
            <DialogDescription>
              {editingRate
                ? 'Update the tax rate details'
                : 'Configure a new tax rate for invoices'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-name">Name</Label>
              <Input
                id="tax-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Sales Tax"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-rate">Rate (%)</Label>
              <div className="relative">
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.rate}
                  onChange={(e) => updateField('rate', e.target.value)}
                  placeholder="e.g. 8.875"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-region">Region (optional)</Label>
              <Input
                id="tax-region"
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder="e.g. NY, CA, EU"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isInclusive}
                  onChange={(e) => updateField('isInclusive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Tax-inclusive pricing
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => updateField('isDefault', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Default tax rate
              </label>
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
                  {editingRate ? 'Updating...' : 'Creating...'}
                </>
              ) : editingRate ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Tax Rate</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-semibold">{deactivatingRate?.name}</span>?
              Existing invoices will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false);
                setDeactivatingRate(null);
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
