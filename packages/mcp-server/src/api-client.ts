import { config } from './config.js';
import type {
  Business,
  Service,
  TimeSlot,
  BookingSession,
  Booking,
  CancellationResult,
  ApiErrorResponse,
} from './types.js';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export class SavSpotApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly error?: string,
  ) {
    super(message);
    this.name = 'SavSpotApiError';
  }
}

export class SavSpotApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl ?? config.apiUrl;
    this.apiKey = apiKey ?? config.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(waitMs);
          continue;
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => ({
            statusCode: response.status,
            message: response.statusText,
          }))) as ApiErrorResponse;
          throw new SavSpotApiError(
            body.statusCode ?? response.status,
            body.message ?? response.statusText,
            body.error,
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof SavSpotApiError) {
          throw error;
        }

        if (attempt < MAX_RETRIES - 1) {
          await this.sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async listBusinesses(params?: {
    category?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    query?: string;
  }): Promise<Business[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.lat !== undefined) searchParams.set('lat', String(params.lat));
    if (params?.lng !== undefined) searchParams.set('lng', String(params.lng));
    if (params?.radiusKm !== undefined) searchParams.set('radiusKm', String(params.radiusKm));
    if (params?.query) searchParams.set('query', params.query);

    const qs = searchParams.toString();
    return this.request<Business[]>(`/businesses${qs ? `?${qs}` : ''}`);
  }

  async getBusiness(id: string): Promise<Business> {
    return this.request<Business>(`/businesses/${id}`);
  }

  async listServices(businessId: string): Promise<Service[]> {
    return this.request<Service[]>(`/businesses/${businessId}/services`);
  }

  async getService(id: string): Promise<Service> {
    return this.request<Service>(`/services/${id}`);
  }

  async checkAvailability(params: {
    serviceId: string;
    date: string;
    staffId?: string;
    guestCount?: number;
  }): Promise<TimeSlot[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('date', params.date);
    if (params.staffId) searchParams.set('staffId', params.staffId);
    if (params.guestCount !== undefined) searchParams.set('guestCount', String(params.guestCount));

    return this.request<TimeSlot[]>(
      `/services/${params.serviceId}/availability?${searchParams.toString()}`,
    );
  }

  async createBookingSession(params: {
    serviceId: string;
    clientEmail: string;
    clientName: string;
    date: string;
    timeSlot: string;
    guestCount?: number;
  }): Promise<BookingSession> {
    return this.request<BookingSession>('/booking-sessions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getBookingSession(id: string): Promise<BookingSession> {
    return this.request<BookingSession>(`/booking-sessions/${id}`);
  }

  async updateBookingSession(
    id: string,
    data: Record<string, unknown>,
  ): Promise<BookingSession> {
    return this.request<BookingSession>(`/booking-sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeBookingSession(id: string): Promise<Booking> {
    return this.request<Booking>(`/booking-sessions/${id}/complete`, {
      method: 'POST',
    });
  }

  async getBooking(id: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}`);
  }

  async cancelBooking(id: string, reason?: string): Promise<CancellationResult> {
    return this.request<CancellationResult>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}
