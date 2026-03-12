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
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

type DiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
type DiscountApplication = 'CODE_REQUIRED' | 'AUTOMATIC' | 'ADMIN_ONLY';

interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  application: DiscountApplication;
  minBookingAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
  createdAt: string;
}

interface DiscountFormData {
  code: string;
  type: DiscountType;
  value: string;
  application: DiscountApplication;
  minBookingAmount: string;
  maxUses: string;
  validFrom: string;
  validTo: string;
}

const EMPTY_FORM: DiscountFormData = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  application: 'CODE_REQUIRED',
  minBookingAmount: '',
  maxUses: '',
  validFrom: '',
  validTo: '',
};

// ---------- Helpers ----------

function getDiscountStatus(
  discount: Discount,
): { label: string; variant: 'active' | 'inactive' | 'expired' } {
  if (!discount.active) {
    return { label: 'Inactive', variant: 'inactive' };
  }
  if (discount.validTo && new Date(discount.validTo) < new Date()) {
    return { label: 'Expired', variant: 'expired' };
  }
  return { label: 'Active', variant: 'active' };
}

function getStatusBadge(status: { label: string; variant: string }) {
  switch (status.variant) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">{status.label}</Badge>;
    case 'expired':
      return <Badge className="bg-red-100 text-red-800">{status.label}</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status.label}</Badge>;
  }
}

function formatDiscountValue(type: DiscountType, value: number): string {
  switch (type) {
    case 'PERCENTAGE':
      return `${value}%`;
    case 'FIXED':
      return `$${value.toFixed(2)}`;
    case 'FREE_HOURS':
      return `${value} hrs`;
    default:
      return String(value);
  }
}

function formatDiscountType(type: DiscountType): string {
  switch (type) {
    case 'PERCENTAGE':
      return 'Percentage';
    case 'FIXED':
      return 'Fixed Amount';
    case 'FREE_HOURS':
      return 'Free Hours';
    default:
      return type;
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

function getValueLabel(type: DiscountType): string {
  switch (type) {
    case 'PERCENTAGE':
      return 'Discount (%)';
    case 'FIXED':
      return 'Amount ($)';
    case 'FREE_HOURS':
      return 'Free Hours';
    default:
      return 'Value';
  }
}

function getValuePlaceholder(type: DiscountType): string {
  switch (type) {
    case 'PERCENTAGE':
      return 'e.g. 15';
    case 'FIXED':
      return 'e.g. 10.00';
    case 'FREE_HOURS':
      return 'e.g. 1';
    default:
      return '';
  }
}

// ---------- Component ----------

export default function DiscountsSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<DiscountFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingDiscount, setDeactivatingDiscount] = useState<Discount | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Actions dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch discounts
  const fetchDiscounts = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await apiClient.get<Discount[]>(
        `/api/tenants/${tenantId}/discounts`,
      );
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load discounts',
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
    void fetchDiscounts();
  }, [tenantId, fetchDiscounts]);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingDiscount(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value.toString(),
      application: discount.application,
      minBookingAmount: discount.minBookingAmount
        ? discount.minBookingAmount.toString()
        : '',
      maxUses: discount.maxUses?.toString() ?? '',
      validFrom: discount.validFrom
        ? discount.validFrom.slice(0, 10)
        : '',
      validTo: discount.validTo
        ? discount.validTo.slice(0, 10)
        : '',
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  // Handle form field changes
  const updateField = <K extends keyof DiscountFormData>(
    field: K,
    value: DiscountFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Submit form (create or update)
  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    // Validation
    const code = formData.code.trim().toUpperCase();
    if (!code) {
      setFormError('Discount code is required');
      return;
    }

    const numValue = parseFloat(formData.value);
    if (isNaN(numValue) || numValue <= 0) {
      setFormError('Value must be a positive number');
      return;
    }

    if (formData.type === 'PERCENTAGE' && numValue > 100) {
      setFormError('Percentage cannot exceed 100%');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        code,
        type: formData.type,
        value: numValue,
        application: formData.application,
        minBookingAmount: formData.minBookingAmount
          ? parseFloat(formData.minBookingAmount)
          : null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : null,
        validFrom: formData.validFrom || null,
        validTo: formData.validTo || null,
      };

      if (editingDiscount) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/discounts/${editingDiscount.id}`,
          payload,
        );
        setSuccess('Discount updated successfully');
      } else {
        await apiClient.post(
          `/api/tenants/${tenantId}/discounts`,
          payload,
        );
        setSuccess('Discount created successfully');
      }

      setDialogOpen(false);
      await fetchDiscounts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save discount',
      );
    } finally {
      setSaving(false);
    }
  };

  // Deactivate discount
  const handleDeactivate = async () => {
    if (!tenantId || !deactivatingDiscount) return;
    setDeactivating(true);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/discounts/${deactivatingDiscount.id}`,
      );
      setDeactivateDialogOpen(false);
      setDeactivatingDiscount(null);
      setSuccess('Discount deactivated successfully');
      await fetchDiscounts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to deactivate discount',
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
            onClick={() => router.push(ROUTES.SETTINGS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Discounts</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage promo codes for your services
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Discount
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

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discount Codes</CardTitle>
          <CardDescription>
            {discounts.length === 0
              ? 'No discounts created yet. Create one to offer promotions to your clients.'
              : `${discounts.length} discount${discounts.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Create your first discount code to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Discount
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => {
                  const status = getDiscountStatus(discount);

                  return (
                    <TableRow key={discount.id}>
                      <TableCell>
                        <span className="font-mono font-medium">
                          {discount.code}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDiscountType(discount.type)}
                      </TableCell>
                      <TableCell>
                        {formatDiscountValue(discount.type, discount.value)}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {discount.usedCount}
                          {discount.maxUses ? ` / ${discount.maxUses}` : ''}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {discount.validFrom || discount.validTo ? (
                          <span>
                            {formatDate(discount.validFrom)} -{' '}
                            {formatDate(discount.validTo)}
                          </span>
                        ) : (
                          <span>No limit</span>
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
                                openActionId === discount.id
                                  ? null
                                  : discount.id,
                              );
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>

                          {openActionId === discount.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                onClick={() => openEditDialog(discount)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              {discount.active && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                  onClick={() => {
                                    setDeactivatingDiscount(discount);
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
                  );
                })}
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
              {editingDiscount ? 'Edit Discount' : 'Create Discount'}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? 'Update the discount details below'
                : 'Set up a new discount or promo code for your clients'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="discount-code">Discount Code</Label>
              <Input
                id="discount-code"
                value={formData.code}
                onChange={(e) =>
                  updateField('code', e.target.value.toUpperCase())
                }
                placeholder="e.g. SUMMER25"
                className="font-mono uppercase"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="discount-type">Discount Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  updateField('type', v as DiscountType)
                }
              >
                <SelectTrigger id="discount-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  <SelectItem value="FREE_HOURS">Free Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="discount-value">
                {getValueLabel(formData.type)}
              </Label>
              <div className="relative">
                {formData.type === 'FIXED' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                )}
                <Input
                  id="discount-value"
                  type="number"
                  step={formData.type === 'FIXED' ? '0.01' : '1'}
                  min="0"
                  max={formData.type === 'PERCENTAGE' ? '100' : undefined}
                  value={formData.value}
                  onChange={(e) => updateField('value', e.target.value)}
                  placeholder={getValuePlaceholder(formData.type)}
                  className={formData.type === 'FIXED' ? 'pl-7' : ''}
                />
                {formData.type === 'PERCENTAGE' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                )}
              </div>
            </div>

            {/* Application */}
            <div className="space-y-2">
              <Label htmlFor="discount-application">Application</Label>
              <Select
                value={formData.application}
                onValueChange={(v) =>
                  updateField(
                    'application',
                    v as DiscountApplication,
                  )
                }
              >
                <SelectTrigger id="discount-application" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE_REQUIRED">Code Required</SelectItem>
                  <SelectItem value="AUTOMATIC">Automatic</SelectItem>
                  <SelectItem value="ADMIN_ONLY">Admin Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Booking Amount */}
            <div className="space-y-2">
              <Label htmlFor="discount-min-amount">
                Minimum Booking Amount (optional)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="discount-min-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minBookingAmount}
                  onChange={(e) =>
                    updateField('minBookingAmount', e.target.value)
                  }
                  placeholder="No minimum"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Max Uses */}
            <div className="space-y-2">
              <Label htmlFor="discount-max-uses">
                Maximum Uses (optional)
              </Label>
              <Input
                id="discount-max-uses"
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) => updateField('maxUses', e.target.value)}
                placeholder="Unlimited"
              />
            </div>

            {/* Valid Period */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount-valid-from">Valid From (optional)</Label>
                <Input
                  id="discount-valid-from"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    updateField('validFrom', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-valid-to">Valid To (optional)</Label>
                <Input
                  id="discount-valid-to"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) =>
                    updateField('validTo', e.target.value)
                  }
                />
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
            <Button onClick={handleSubmitForm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingDiscount ? 'Updating...' : 'Creating...'}
                </>
              ) : editingDiscount ? (
                'Update Discount'
              ) : (
                'Create Discount'
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
            <DialogTitle>Deactivate Discount</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate the discount code{' '}
              <span className="font-mono font-semibold">
                {deactivatingDiscount?.code}
              </span>
              ? Clients will no longer be able to use this code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false);
                setDeactivatingDiscount(null);
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
