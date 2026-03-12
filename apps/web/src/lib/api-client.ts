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
  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    const method = (options?.method ?? 'GET').toUpperCase();
    const isRetryable = method === 'GET';
    const maxRetries = isRetryable ? 3 : 0;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
          credentials: 'include',
        });

        if (res.status === 401) {
          const refreshed = await this.tryRefresh();
          if (refreshed) {
            const retry = await fetch(`${API_URL}${path}`, {
              ...options,
              headers,
              credentials: 'include',
            });
            if (!retry.ok) throw new ApiError(retry.status, await retry.text());
            const json = (await retry.json()) as { data?: T };
            return json.data !== undefined ? json.data : (json as T);
          }
        }

        if (!res.ok) {
          const error = new ApiError(res.status, await res.text());
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

    throw lastError ?? new Error('Request failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  async requestRaw<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retry = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
          credentials: 'include',
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
