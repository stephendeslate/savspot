'use client';

import { useState, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import { Button, Checkbox, Card, CardContent, CardHeader, CardTitle, CardDescription, Separator } from '@savspot/ui';
import type { ServiceAddon } from './booking-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddonSelectionStepProps {
  addons: ServiceAddon[];
  selectedAddonIds: string[];
  onSubmit: (selectedIds: string[]) => void;
  onBack: () => void;
  currencyCode?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddonSelectionStep({
  addons,
  selectedAddonIds,
  onSubmit,
  onBack,
  currencyCode = 'USD',
}: AddonSelectionStepProps) {
  const [selected, setSelected] = useState<string[]>(selectedAddonIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAddon = (addonId: string) => {
    setSelected((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  };

  const selectedTotal = useMemo(() => {
    return addons
      .filter((a) => selected.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0);
  }, [addons, selected]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      onSubmit(selected);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add-ons
        </CardTitle>
        <CardDescription>
          Enhance your booking with optional add-ons. Select any that interest
          you, or skip this step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {addons.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No add-ons available for this service.
          </p>
        ) : (
          addons.map((addon) => {
            const isSelected = selected.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => toggleAddon(addon.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleAddon(addon.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{addon.name}</span>
                    <span className="text-sm font-semibold">
                      +{formatPrice(addon.price, currencyCode)}
                    </span>
                  </div>
                  {addon.description && (
                    <p className="text-sm text-muted-foreground">
                      {addon.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}

        {/* Selected total */}
        {selected.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-muted-foreground">
                {selected.length} add-on{selected.length !== 1 ? 's' : ''}{' '}
                selected
              </span>
              <span className="font-semibold">
                +{formatPrice(selectedTotal, currencyCode)}
              </span>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: 'var(--brand-color)',
              borderColor: 'var(--brand-color)',
            }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Saving...
              </span>
            ) : (
              <>
                {selected.length > 0 ? 'Continue' : 'Skip'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
