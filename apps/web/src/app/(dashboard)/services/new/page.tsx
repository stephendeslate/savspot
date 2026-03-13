'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

/** Currencies that use zero-decimal (no minor units) */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND']);

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'CA$', AUD: 'A$', JPY: '\u00A5',
  };
  return symbols[currency] ?? currency;
}

const serviceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters'),
  description: z.string().optional(),
  durationMinutes: z.coerce
    .number()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration must be at most 8 hours'),
  basePrice: z.coerce
    .number()
    .min(0, 'Price cannot be negative'),
  currency: z.string().min(3).max(3),
  pricingModel: z.string().min(1, 'Pricing model is required'),
  confirmationMode: z.string().min(1, 'Confirmation mode is required'),
  bufferBeforeMinutes: z.coerce.number().min(0).optional(),
  bufferAfterMinutes: z.coerce.number().min(0).optional(),
  guestConfigJson: z.string().optional(),
  tierConfigJson: z.string().optional(),
  depositConfigJson: z.string().optional(),
  cancellationPolicyJson: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function NewServicePage() {
  const router = useRouter();
  const { tenantId } = useTenant();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      durationMinutes: 60,
      basePrice: 0,
      currency: 'USD',
      pricingModel: 'FIXED',
      confirmationMode: 'AUTO_CONFIRM',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      guestConfigJson: '',
      tierConfigJson: '',
      depositConfigJson: '',
      cancellationPolicyJson: '',
    },
  });

  const selectedCurrency = useWatch({ control, name: 'currency' }) ?? 'USD';
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(selectedCurrency);
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  const onSubmit = async (values: ServiceFormValues) => {
    if (!tenantId) return;
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        description: values.description || undefined,
        durationMinutes: values.durationMinutes,
        basePrice: values.basePrice,
        currency: values.currency,
        pricingModel: values.pricingModel,
        confirmationMode: values.confirmationMode,
      };

      if (values.bufferBeforeMinutes && values.bufferBeforeMinutes > 0) {
        payload['bufferBeforeMinutes'] = values.bufferBeforeMinutes;
      }
      if (values.bufferAfterMinutes && values.bufferAfterMinutes > 0) {
        payload['bufferAfterMinutes'] = values.bufferAfterMinutes;
      }

      // Parse optional JSON fields
      if (values.guestConfigJson?.trim()) {
        try {
          payload['guestConfig'] = JSON.parse(values.guestConfigJson);
        } catch {
          setError('Guest config is not valid JSON');
          return;
        }
      }
      if (values.tierConfigJson?.trim()) {
        try {
          payload['tierConfig'] = JSON.parse(values.tierConfigJson);
        } catch {
          setError('Tier config is not valid JSON');
          return;
        }
      }
      if (values.depositConfigJson?.trim()) {
        try {
          payload['depositConfig'] = JSON.parse(values.depositConfigJson);
        } catch {
          setError('Deposit config is not valid JSON');
          return;
        }
      }
      if (values.cancellationPolicyJson?.trim()) {
        try {
          payload['cancellationPolicy'] = JSON.parse(
            values.cancellationPolicyJson,
          );
        } catch {
          setError('Cancellation policy is not valid JSON');
          return;
        }
      }

      await apiClient.post(`/api/tenants/${tenantId}/services`, payload);
      router.push(ROUTES.SERVICES);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create service. Please try again.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.SERVICES)}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Create Service</h2>
          <p className="text-sm text-muted-foreground">
            Add a new service that clients can book
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>
              Set up the essential details for this service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Haircut"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this service includes..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={5}
                  max={480}
                  {...register('durationMinutes')}
                />
                {errors.durationMinutes && (
                  <p className="text-sm text-destructive">
                    {errors.durationMinutes.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price ({currencySymbol}) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min={0}
                  step={isZeroDecimal ? '1' : '0.01'}
                  placeholder={isZeroDecimal ? 'e.g., 5000' : 'e.g., 50.00'}
                  {...register('basePrice')}
                />
                {errors.basePrice && (
                  <p className="text-sm text-destructive">
                    {errors.basePrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model *</Label>
                <Controller
                  control={control}
                  name="pricingModel"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="pricingModel" className="w-full">
                        <SelectValue placeholder="Select pricing model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed Price</SelectItem>
                        <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                        <SelectItem value="TIERED">Tiered Pricing</SelectItem>
                        <SelectItem value="FREE">Free</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.pricingModel && (
                  <p className="text-sm text-destructive">
                    {errors.pricingModel.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationMode">Confirmation Mode *</Label>
                <Controller
                  control={control}
                  name="confirmationMode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="confirmationMode" className="w-full">
                        <SelectValue placeholder="Select confirmation mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO_CONFIRM">Auto-confirm</SelectItem>
                        <SelectItem value="MANUAL_APPROVAL">Manual Review</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.confirmationMode && (
                  <p className="text-sm text-destructive">
                    {errors.confirmationMode.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings (Collapsible) */}
        <Card>
          <CardHeader>
            <button
              type="button"
              className="flex w-full items-center justify-between"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <div className="text-left">
                <CardTitle className="text-base">Advanced Settings</CardTitle>
                <CardDescription>
                  Buffer times, guest config, tiers, deposits, and cancellation
                  policies.
                </CardDescription>
              </div>
              {showAdvanced ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          {showAdvanced && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bufferBeforeMinutes">
                    Buffer Before (minutes)
                  </Label>
                  <Input
                    id="bufferBeforeMinutes"
                    type="number"
                    min={0}
                    placeholder="0"
                    {...register('bufferBeforeMinutes')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bufferAfterMinutes">Buffer After (minutes)</Label>
                  <Input
                    id="bufferAfterMinutes"
                    type="number"
                    min={0}
                    placeholder="0"
                    {...register('bufferAfterMinutes')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestConfigJson">Guest Config (JSON)</Label>
                <Textarea
                  id="guestConfigJson"
                  placeholder='e.g., {"maxGuests": 5, "guestPriceCents": 2000}'
                  rows={2}
                  className="font-mono text-xs"
                  {...register('guestConfigJson')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tierConfigJson">Tier Config (JSON)</Label>
                <Textarea
                  id="tierConfigJson"
                  placeholder='e.g., [{"name": "VIP", "priceCents": 10000}]'
                  rows={2}
                  className="font-mono text-xs"
                  {...register('tierConfigJson')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositConfigJson">
                  Deposit Config (JSON)
                </Label>
                <Textarea
                  id="depositConfigJson"
                  placeholder='e.g., {"required": true, "percentageOrCents": 50, "type": "PERCENTAGE"}'
                  rows={2}
                  className="font-mono text-xs"
                  {...register('depositConfigJson')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancellationPolicyJson">
                  Cancellation Policy (JSON)
                </Label>
                <Textarea
                  id="cancellationPolicyJson"
                  placeholder='e.g., {"freeCancellationHours": 24, "penaltyPercentage": 50}'
                  rows={2}
                  className="font-mono text-xs"
                  {...register('cancellationPolicyJson')}
                />
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.SERVICES)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Service'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
