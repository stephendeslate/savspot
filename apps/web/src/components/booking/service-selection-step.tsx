'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TenantService, BookingSessionData } from './booking-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ServiceSelectionStepProps {
  services: TenantService[];
  currency: string;
  sessionId: string;
  onSelect: (data: Partial<BookingSessionData>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServiceSelectionStep({
  services,
  currency,
  onSelect,
}: ServiceSelectionStepProps) {
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const handleSelect = async (service: TenantService) => {
    setSelectingId(service.id);
    try {
      await onSelect({
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.durationMinutes,
        servicePrice: service.basePrice,
        serviceCurrency: service.currency || currency,
        servicePricingModel: service.pricingModel,
        guestConfig: service.guestConfig,
      });
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Select a Service</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose the service you&apos;d like to book.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const isSelecting = selectingId === service.id;
          const displayCurrency = service.currency || currency;

          return (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelecting
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              } ${selectingId && !isSelecting ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => !selectingId && handleSelect(service)}
            >
              {service.imageUrl && (
                <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <CardHeader className={service.imageUrl ? 'pt-3 pb-2' : 'pb-2'}>
                <CardTitle className="text-base">{service.name}</CardTitle>
                {service.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDuration(service.durationMinutes)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {service.pricingModel === 'PER_GUEST' ? 'From ' : ''}
                  {formatPrice(service.basePrice, displayCurrency)}
                </Badge>
                {service.guestConfig && (
                  <Badge variant="secondary" className="text-xs">
                    {service.guestConfig.min_guests}-
                    {service.guestConfig.max_guests} guests
                  </Badge>
                )}
              </CardContent>
              {isSelecting && (
                <div className="flex items-center justify-center pb-4">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Selecting...
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
