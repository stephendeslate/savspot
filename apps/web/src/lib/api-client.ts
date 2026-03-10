const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('savspot_access_token', access);
      localStorage.setItem('savspot_refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('savspot_access_token');
      localStorage.removeItem('savspot_refresh_token');
    }
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('savspot_access_token');
      this.refreshToken = localStorage.getItem('savspot_refresh_token');
    }
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const method = (options?.method ?? 'GET').toUpperCase();
    const isRetryable = method === 'GET';
    const maxRetries = isRetryable ? 3 : 0;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_URL}${path}`, { ...options, headers });

        if (res.status === 401 && this.refreshToken) {
          const refreshed = await this.tryRefresh();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
            const retry = await fetch(`${API_URL}${path}`, {
              ...options,
              headers,
            });
            if (!retry.ok) throw new ApiError(retry.status, await retry.text());
            const json = (await retry.json()) as { data?: T };
            return json.data !== undefined ? json.data : (json as T);
          }
        }

        if (!res.ok) {
          const error = new ApiError(res.status, await res.text());
          // Retry on 5xx for GET requests
          if (isRetryable && res.status >= 500 && attempt < maxRetries) {
            lastError = error;
            await this.delay(Math.pow(2, attempt) * 1000);
            continue;
          }
          throw error;
        }

        const json = (await res.json()) as { data?: T };
        return json.data !== undefined ? json.data : (json as T);
      } catch (err) {
        // Retry on network errors (TypeError) for GET requests
        if (
          isRetryable &&
          err instanceof TypeError &&
          attempt < maxRetries
        ) {
          lastError = err;
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw err;
      }
    }

    // Should not reach here, but just in case
    throw lastError ?? new Error('Request failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as {
        data?: { accessToken: string; refreshToken: string };
        accessToken?: string;
        refreshToken?: string;
      };
      const data = json.data ?? json;
      if (data.accessToken && data.refreshToken) {
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  /** Like request() but returns the full JSON body without unwrapping `data`. */
  async requestRaw<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retry = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
        });
        if (!retry.ok) throw new ApiError(retry.status, await retry.text());
        return (await retry.json()) as T;
      }
    }

    if (!res.ok) throw new ApiError(res.status, await res.text());
    return (await res.json()) as T;
  }

  getRaw<T>(path: string) {
    return this.requestRaw<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  del<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export { ApiError };
