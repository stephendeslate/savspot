import { config } from './config.js';
import type {
  Business,
  BusinessDetail,
  Service,
  AvailabilityResponse,
  BookingSession,
  BookingSessionComplete,
  Booking,
  CancellationResult,
  ApiListResponse,
  ApiDataResponse,
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
    cursor?: string;
    limit?: number;
  }): Promise<ApiListResponse<Business>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.lat !== undefined) searchParams.set('lat', String(params.lat));
    if (params?.lng !== undefined) searchParams.set('lng', String(params.lng));
    if (params?.radiusKm !== undefined) searchParams.set('radius_km', String(params.radiusKm));
    if (params?.query) searchParams.set('query', params.query);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return this.request<ApiListResponse<Business>>(`/businesses${qs ? `?${qs}` : ''}`);
  }

  async getBusiness(id: string): Promise<BusinessDetail> {
    const response = await this.request<ApiDataResponse<BusinessDetail>>(`/businesses/${id}`);
    return response.data;
  }

  async listServices(businessId: string): Promise<Service[]> {
    const response = await this.request<ApiDataResponse<Service[]>>(
      `/businesses/${businessId}/services`,
    );
    return response.data;
  }

  async getService(id: string): Promise<Service> {
    const response = await this.request<ApiDataResponse<Service>>(`/services/${id}`);
    return response.data;
  }

  async checkAvailability(params: {
    serviceId: string;
    date: string;
    staffId?: string;
    guestCount?: number;
  }): Promise<AvailabilityResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('service_id', params.serviceId);
    searchParams.set('date', params.date);
    if (params.staffId) searchParams.set('staff_id', params.staffId);
    if (params.guestCount !== undefined) searchParams.set('guest_count', String(params.guestCount));

    const response = await this.request<ApiDataResponse<AvailabilityResponse>>(
      `/availability?${searchParams.toString()}`,
    );
    return response.data;
  }

  async createBookingSession(params: {
    serviceId: string;
    clientEmail: string;
    clientName: string;
    date: string;
    timeSlot: string;
    guestCount?: number;
    clientConsent?: boolean;
  }): Promise<BookingSession> {
    const response = await this.request<ApiDataResponse<BookingSession>>('/booking-sessions', {
      method: 'POST',
      body: JSON.stringify({
        service_id: params.serviceId,
        client_email: params.clientEmail,
        client_name: params.clientName,
        date: params.date,
        time_slot: params.timeSlot,
        guest_count: params.guestCount,
        client_consent: params.clientConsent,
      }),
    });
    return response.data;
  }

  async getBookingSession(id: string): Promise<BookingSession> {
    const response = await this.request<ApiDataResponse<BookingSession>>(
      `/booking-sessions/${id}`,
    );
    return response.data;
  }

  async updateBookingSession(
    id: string,
    data: Record<string, unknown>,
  ): Promise<BookingSession> {
    const response = await this.request<ApiDataResponse<BookingSession>>(
      `/booking-sessions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ fields: data }),
      },
    );
    return response.data;
  }

  async completeBookingSession(id: string): Promise<BookingSessionComplete> {
    const response = await this.request<ApiDataResponse<BookingSessionComplete>>(
      `/booking-sessions/${id}/complete`,
      {
        method: 'POST',
      },
    );
    return response.data;
  }

  async getBooking(id: string): Promise<Booking> {
    const response = await this.request<ApiDataResponse<Booking>>(`/bookings/${id}`);
    return response.data;
  }

  async cancelBooking(id: string): Promise<CancellationResult> {
    const response = await this.request<ApiDataResponse<CancellationResult>>(`/bookings/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  }
}
