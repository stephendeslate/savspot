// ---------------------------------------------------------------------------
// Shared types for the booking flow
// ---------------------------------------------------------------------------

export interface GuestConfig {
  min_guests: number;
  max_guests: number;
  price_per_guest?: number;
  age_tiers?: AgeTier[];
}

export interface AgeTier {
  label: string;
  min_age: number;
  max_age: number;
  price: number;
}

export interface TenantService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  pricingModel: string;
  imageUrl: string | null;
  guestConfig: GuestConfig | null;
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  brandColor: string | null;
  timezone: string;
  currency: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  category: string | null;
  services: TenantService[];
}

export interface BookingStep {
  type: BookingStepType;
  label: string;
  order: number;
}

export type BookingStepType =
  | 'SERVICE_SELECTION'
  | 'VENUE_SELECTION'
  | 'DATE_TIME_PICKER'
  | 'GUEST_COUNT'
  | 'PRICING_SUMMARY'
  | 'CLIENT_INFO'
  | 'PAYMENT'
  | 'CONFIRMATION';

export interface BookingSessionData {
  serviceId?: string;
  serviceName?: string;
  serviceDuration?: number;
  servicePrice?: number;
  serviceCurrency?: string;
  servicePricingModel?: string;
  guestConfig?: GuestConfig | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  guestTierCounts?: Record<string, number>;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  reservationId?: string;
  totalAmount?: number;
  depositAmount?: number;
  bookingId?: string;
  [key: string]: unknown;
}

export interface BookingSession {
  id: string;
  resolvedSteps: BookingStep[];
  status: string;
  currentStep: number;
  data: BookingSessionData;
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
