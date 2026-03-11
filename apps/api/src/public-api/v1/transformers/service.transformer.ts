interface DecimalLike {
  toNumber(): number;
}

interface ServiceRecord {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: DecimalLike | number;
  currency: string;
  pricingModel: string;
  guestConfig: unknown;
  category: { id: string; name: string } | null;
}

interface ServiceAddonRecord {
  id: string;
  name: string;
  description: string | null;
  price: DecimalLike | number;
}

export interface ServiceResponse {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  pricingModel: string;
  guestConfig: unknown;
  category: { id: string; name: string } | null;
  addOns: ServiceAddonResponse[];
}

export interface ServiceAddonResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export function transformService(
  service: ServiceRecord,
  addOns: ServiceAddonRecord[] = [],
): ServiceResponse {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: toNumber(service.basePrice),
    currency: service.currency,
    pricingModel: service.pricingModel,
    guestConfig: service.guestConfig ?? null,
    category: service.category,
    addOns: addOns.map(transformAddon),
  };
}

function transformAddon(addon: ServiceAddonRecord): ServiceAddonResponse {
  return {
    id: addon.id,
    name: addon.name,
    description: addon.description,
    price: toNumber(addon.price),
  };
}

function toNumber(value: DecimalLike | number): number {
  if (typeof value === 'number') return value;
  return value.toNumber();
}
