'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { User, Loader2 } from 'lucide-react';
import { Card, CardContent, Skeleton } from '@savspot/ui';
import type { BookingSessionData } from './booking-types';
import { API_URL } from './booking-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StaffProvider {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  title: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StaffSelectionStepProps {
  tenantId: string;
  serviceId: string;
  onSelect: (data: Partial<BookingSessionData>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StaffSelectionStep({
  tenantId,
  serviceId,
  onSelect,
}: StaffSelectionStepProps) {
  const [providers, setProviders] = useState<StaffProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProviders() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/tenants/${tenantId}/services/${serviceId}/providers/public`,
        );
        if (!res.ok) throw new Error('Failed to load staff');
        const json = (await res.json()) as { data: StaffProvider[] };
        setProviders(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load staff');
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, [tenantId, serviceId]);

  const handleSelect = async (provider: StaffProvider | null) => {
    const id = provider?.id ?? 'no-preference';
    setSelectingId(id);
    try {
      await onSelect({
        staffId: provider?.id,
        staffName: provider?.name,
        staffAvatarUrl: provider?.avatarUrl ?? undefined,
      });
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-semibold">Choose Your Provider</h2>
        <p className="mb-6 text-sm text-muted-foreground">Loading staff...</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          className="mt-2 text-xs underline text-muted-foreground"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const isAnySelecting = selectingId !== null;

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Choose Your Provider</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Select a staff member or choose &quot;No Preference&quot; for the first
        available.
      </p>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-x-visible sm:pb-0">
        {/* No Preference option */}
        <Card
          role="button"
          tabIndex={isAnySelecting && selectingId !== 'no-preference' ? -1 : 0}
          aria-label="No Preference — first available provider"
          aria-busy={selectingId === 'no-preference'}
          className={`min-w-[140px] shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
            selectingId === 'no-preference'
              ? 'border-primary ring-2 ring-primary/20'
              : 'hover:border-primary/50'
          } ${isAnySelecting && selectingId !== 'no-preference' ? 'pointer-events-none opacity-50' : ''}`}
          onClick={() => !isAnySelecting && handleSelect(null)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isAnySelecting) {
              e.preventDefault();
              handleSelect(null);
            }
          }}
        >
          <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">No Preference</p>
              <p className="text-xs text-muted-foreground">First available</p>
            </div>
            {selectingId === 'no-preference' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </CardContent>
        </Card>

        {/* Staff cards */}
        {providers.map((provider) => {
          const isSelecting = selectingId === provider.id;
          return (
            <Card
              key={provider.id}
              role="button"
              tabIndex={isAnySelecting && !isSelecting ? -1 : 0}
              aria-label={`${provider.name}${provider.title ? `, ${provider.title}` : ''}`}
              aria-busy={isSelecting}
              className={`min-w-[140px] shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                isSelecting
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              } ${isAnySelecting && !isSelecting ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => !isAnySelecting && handleSelect(provider)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isAnySelecting) {
                  e.preventDefault();
                  handleSelect(provider);
                }
              }}
            >
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                {/* Avatar */}
                {provider.avatarUrl ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-full">
                    <Image
                      src={provider.avatarUrl}
                      alt={provider.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                    {provider.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{provider.name}</p>
                  {provider.title && (
                    <p className="text-xs text-muted-foreground">
                      {provider.title}
                    </p>
                  )}
                </div>
                {isSelecting && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
