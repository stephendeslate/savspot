export interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  categoryLabel: string | null;
  address: {
    street: unknown;
    city: unknown;
    state: unknown;
    postalCode: unknown;
    country: unknown;
  } | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  timezone: string;
  currency: string;
  bookingPageUrl: string;
}

export interface BusinessDetail extends Business {
  servicesCount: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  pricingModel: string;
  guestConfig: unknown;
  category: { id: string; name: string } | null;
  addOns: ServiceAddon[];
}

export interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export interface AvailabilityResponse {
  date: string;
  service_id: string;
  staff_id: string | null;
  guest_count: number;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface BookingSession {
  id: string;
  status: string;
  current_step: string;
  resolved_steps: unknown;
  data?: Record<string, unknown>;
  service: { id: string; name: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface BookingSessionComplete {
  booking_id: string;
  status: string;
  start_time: string;
  end_time: string;
}

export interface Booking {
  id: string;
  status: string;
  serviceName: string | null;
  startTime: string;
  endTime: string;
  totalAmount: number;
  currency: string;
  guestCount: number | null;
}

export interface CancellationResult {
  id: string;
  status: string;
  cancelled_at: string | null;
}

export interface PaginationInfo {
  next_cursor: string | null;
  has_more: boolean;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ApiDataResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}
