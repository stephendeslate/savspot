export interface Business {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  currency: string;
  logoUrl: string | null;
  coverUrl: string | null;
  rating: number | null;
  reviewCount: number;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  duration: number;
  price: string;
  currency: string;
  category: string | null;
  requiresDeposit: boolean;
  depositAmount: string | null;
  maxGuests: number;
  isActive: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  staffId: string | null;
  staffName: string | null;
  available: boolean;
}

export interface BookingSession {
  id: string;
  serviceId: string;
  status: string;
  expiresAt: string;
  steps: string[];
  currentStep: string;
  data: Record<string, unknown>;
}

export interface Booking {
  id: string;
  businessId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  status: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  currency: string;
  staffName: string | null;
  notes: string | null;
  confirmationCode: string;
}

export interface CancellationResult {
  bookingId: string;
  status: string;
  refundAmount: string | null;
  refundStatus: string | null;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}
