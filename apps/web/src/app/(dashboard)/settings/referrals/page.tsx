'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';
import { formatAmount } from '@/lib/format-utils';
import { RequireRole } from '@/components/rbac/require-role';

// ---------- Types ----------

interface Referral {
  id: string;
  code: string;
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionValue: number;
  totalUses: number;
  totalEarnings: string;
  currency: string;
  active: boolean;
  createdAt: string;
}

interface ReferralFormData {
  code: string;
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionValue: string;
}

const EMPTY_FORM: ReferralFormData = {
  code: '',
  commissionType: 'PERCENTAGE',
  commissionValue: '',
};

// ---------- Helpers ----------

function formatCommission(type: string, value: number): string {
  return type === 'PERCENTAGE' ? `${value}%` : `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------- Component ----------

export default function ReferralsSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ReferralFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingReferral, setDeactivatingReferral] = useState<Referral | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Actions dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch referrals
  const fetchReferrals = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await apiClient.get<Referral[]>(
        `/api/tenants/${tenantId}/referrals`,
      );
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load referrals',
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
    void fetchReferrals();
  }, [tenantId, fetchReferrals]);

  // Open create dialog
  const openCreateDialog = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  // Handle form field changes
  const updateField = <K extends keyof ReferralFormData>(
    field: K,
    value: ReferralFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Submit form (create)
  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    const code = formData.code.trim().toUpperCase();
    if (!code) {
      setFormError('Referral code is required');
      return;
    }

    const numValue = parseFloat(formData.commissionValue);
    if (isNaN(numValue) || numValue <= 0) {
      setFormError('Commission value must be a positive number');
      return;
    }

    if (formData.commissionType === 'PERCENTAGE' && numValue > 100) {
      setFormError('Percentage cannot exceed 100%');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        code,
        commissionType: formData.commissionType,
        commissionValue: numValue,
      };

      await apiClient.post(
        `/api/tenants/${tenantId}/referrals`,
        payload,
      );
      setSuccess('Referral created successfully');

      setDialogOpen(false);
      await fetchReferrals();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to create referral',
      );
    } finally {
      setSaving(false);
    }
  };

  // Deactivate referral
  const handleDeactivate = async () => {
    if (!tenantId || !deactivatingReferral) return;
    setDeactivating(true);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/referrals/${deactivatingReferral.id}`,
      );
      setDeactivateDialogOpen(false);
      setDeactivatingReferral(null);
      setSuccess('Referral deactivated successfully');
      await fetchReferrals();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to deactivate referral',
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

  // Computed stats
  const totalReferrals = referrals.length;
  const totalUses = referrals.reduce((sum, r) => sum + r.totalUses, 0);
  const totalEarnings = referrals.reduce(
    (sum, r) => sum + Number(r.totalEarnings),
    0,
  );
  const defaultCurrency = referrals[0]?.currency || 'USD';

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
    <RequireRole minimum="ADMIN">
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
            <h2 className="text-lg font-semibold">Referrals</h2>
            <p className="text-sm text-muted-foreground">
              Manage referral programs and commissions
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Referral
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

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalReferrals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Uses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatAmount(totalEarnings.toFixed(2), defaultCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral Programs</CardTitle>
          <CardDescription>
            {referrals.length === 0
              ? 'No referral programs created yet.'
              : `${referrals.length} referral${referrals.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Share2 className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No referral programs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first referral program to start earning commissions.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Referral
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <span className="font-mono font-medium">
                        {referral.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatCommission(referral.commissionType, referral.commissionValue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {referral.totalUses}
                    </TableCell>
                    <TableCell>
                      {formatAmount(referral.totalEarnings, referral.currency)}
                    </TableCell>
                    <TableCell>
                      {referral.active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(referral.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(
                              openActionId === referral.id
                                ? null
                                : referral.id,
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {openActionId === referral.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                            {referral.active && (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                onClick={() => {
                                  setDeactivatingReferral(referral);
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Referral</DialogTitle>
            <DialogDescription>
              Set up a new referral program with commission details
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="referral-code">Referral Code</Label>
              <Input
                id="referral-code"
                value={formData.code}
                onChange={(e) =>
                  updateField('code', e.target.value.toUpperCase())
                }
                placeholder="e.g. REFER50"
                className="font-mono uppercase"
              />
            </div>

            {/* Commission Type */}
            <div className="space-y-2">
              <Label htmlFor="commission-type">Commission Type</Label>
              <Select
                value={formData.commissionType}
                onValueChange={(v) =>
                  updateField('commissionType', v as 'PERCENTAGE' | 'FIXED')
                }
              >
                <SelectTrigger id="commission-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commission Value */}
            <div className="space-y-2">
              <Label htmlFor="commission-value">
                {formData.commissionType === 'PERCENTAGE'
                  ? 'Commission (%)'
                  : 'Commission Amount ($)'}
              </Label>
              <div className="relative">
                {formData.commissionType === 'FIXED' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                )}
                <Input
                  id="commission-value"
                  type="number"
                  step={formData.commissionType === 'FIXED' ? '0.01' : '1'}
                  min="0"
                  max={formData.commissionType === 'PERCENTAGE' ? '100' : undefined}
                  value={formData.commissionValue}
                  onChange={(e) => updateField('commissionValue', e.target.value)}
                  placeholder={formData.commissionType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5.00'}
                  className={formData.commissionType === 'FIXED' ? 'pl-7' : ''}
                />
                {formData.commissionType === 'PERCENTAGE' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                )}
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
                  Creating...
                </>
              ) : (
                'Create Referral'
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
            <DialogTitle>Deactivate Referral</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate the referral code{' '}
              <span className="font-mono font-semibold">
                {deactivatingReferral?.code}
              </span>
              ? This referral will no longer generate commissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false);
                setDeactivatingReferral(null);
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
    </RequireRole>
  );
}
