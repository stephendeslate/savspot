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
  addons?: ServiceAddon[];
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
  address: { street?: string; city?: string; state?: string; zip?: string; country?: string } | null;
  contactEmail: string | null;
  contactPhone: string | null;
  category: string | null;
  categoryLabel: string | null;
  services: TenantService[];
}

export interface BookingStep {
  type: BookingStepType;
  label: string;
  order: number;
  config?: BookingStepConfig;
}

export interface BookingStepConfig {
  formConfig?: IntakeFormConfig;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Questionnaire / Intake Form
// ---------------------------------------------------------------------------

export interface IntakeFormField {
  id: string;
  label: string;
  type: IntakeFormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: Record<string, unknown>;
}

export type IntakeFormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'NUMBER'
  | 'DATE'
  | 'EMAIL'
  | 'PHONE';

export interface IntakeFormConfig {
  fields: IntakeFormField[];
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

export interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export type BookingStepType =
  | 'SERVICE_SELECTION'
  | 'VENUE_SELECTION'
  | 'DATE_TIME_PICKER'
  | 'GUEST_COUNT'
  | 'QUESTIONNAIRE'
  | 'ADD_ONS'
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
  questionnaireResponses?: Record<string, unknown>;
  selectedAddonIds?: string[];
  selectedAddons?: ServiceAddon[];
  [key: string]: unknown;
}

export interface BookingSession {
  id: string;
  serviceId: string | null;
  service?: {
    id: string;
    name: string;
    durationMinutes: number;
    basePrice: number;
    currency: string;
  };
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
