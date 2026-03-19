'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@savspot/ui';
import type { TenantService, BookingSessionData } from './booking-types';
import { formatDuration, formatPrice } from '@/lib/booking-format-utils';

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
        {services.map((service, index) => {
          const isSelecting = selectingId === service.id;
          const displayCurrency = service.currency || currency;
          const isFirstService = index === 0;

          return (
            <Card
              key={service.id}
              role="button"
              tabIndex={selectingId && !isSelecting ? -1 : 0}
              aria-label={`${service.name}, ${formatDuration(service.durationMinutes)}, ${formatPrice(service.basePrice, displayCurrency)}`}
              aria-busy={isSelecting}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                isSelecting
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              } ${selectingId && !isSelecting ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => !selectingId && handleSelect(service)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !selectingId) {
                  e.preventDefault();
                  handleSelect(service);
                }
              }}
            >
              {service.imageUrl && (
                <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                  <Image
                    src={service.imageUrl}
                    alt={service.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <CardHeader className={service.imageUrl ? 'pt-3 pb-2' : 'pb-2'}>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  {isFirstService && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Most Popular
                    </Badge>
                  )}
                </div>
                {service.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                <Badge variant="secondary" className="text-xs font-medium">
                  <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                  {formatDuration(service.durationMinutes)}
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold">
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
