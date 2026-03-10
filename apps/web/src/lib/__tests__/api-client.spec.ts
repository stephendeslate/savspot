import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need a fresh module for each test to get a fresh singleton
let apiClient: typeof import('../api-client').apiClient;
let ApiError: typeof import('../api-client').ApiError;

beforeEach(async () => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  });

  // Re-import to get a fresh instance
  vi.resetModules();
  const mod = await import('../api-client');
  apiClient = mod.apiClient;
  ApiError = mod.ApiError;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ApiClient', () => {
  describe('setTokens / clearTokens / loadTokens', () => {
    it('should store tokens in localStorage', () => {
      apiClient.setTokens('access-123', 'refresh-456');

      expect(localStorage.getItem('savspot_access_token')).toBe('access-123');
      expect(localStorage.getItem('savspot_refresh_token')).toBe('refresh-456');
    });

    it('should clear tokens from localStorage', () => {
      apiClient.setTokens('access-123', 'refresh-456');
      apiClient.clearTokens();

      expect(localStorage.getItem('savspot_access_token')).toBeNull();
      expect(localStorage.getItem('savspot_refresh_token')).toBeNull();
    });

    it('should load tokens from localStorage', () => {
      localStorage.setItem('savspot_access_token', 'loaded-access');
      localStorage.setItem('savspot_refresh_token', 'loaded-refresh');

      apiClient.loadTokens();

      // Verify by making a request — the Authorization header should be set
      // We'll test this indirectly through request()
    });
  });

  describe('request', () => {
    it('should make a fetch request with correct headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await apiClient.get<{ id: number }>('/api/test');

      expect(result).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should include Authorization header when token is set', async () => {
      apiClient.setTokens('my-token', 'my-refresh');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await apiClient.get('/api/test');

      const headers = mockFetch.mock.calls[0]![1].headers;
      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    it('should unwrap { data: ... } response envelope', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { name: 'Test' } }),
        }),
      );

      const result = await apiClient.get<{ name: string }>('/api/test');

      expect(result).toEqual({ name: 'Test' });
    });

    it('should return full body when no data wrapper exists', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ name: 'Direct' }),
        }),
      );

      const result = await apiClient.get<{ name: string }>('/api/test');

      expect(result).toEqual({ name: 'Direct' });
    });

    it('should throw ApiError on non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        }),
      );

      await expect(apiClient.get('/api/missing')).rejects.toThrow(ApiError);

      try {
        await apiClient.get('/api/missing');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as InstanceType<typeof ApiError>).status).toBe(404);
      }
    });

    it('should attempt token refresh on 401', async () => {
      apiClient.setTokens('expired-token', 'valid-refresh');

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        callCount++;
        // First call: 401
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized'),
          });
        }
        // Second call: refresh endpoint
        if ((url as string).includes('/api/auth/refresh')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                accessToken: 'new-access',
                refreshToken: 'new-refresh',
              }),
          });
        }
        // Third call: retry original request
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { success: true } }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await apiClient.get<{ success: boolean }>('/api/test');

      expect(result).toEqual({ success: true });
      // 3 calls: original, refresh, retry
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('post / patch / del', () => {
    it('should send POST with JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: { id: 'new-1' } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await apiClient.post<{ id: string }>('/api/items', {
        name: 'Test',
      });

      expect(result).toEqual({ id: 'new-1' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        }),
      );
    });

    it('should send PATCH with JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { updated: true } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await apiClient.patch('/api/items/1', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/items/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        }),
      );
    });

    it('should send DELETE without body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      await apiClient.del('/api/items/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/items/1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('retry logic', () => {
    it('should succeed on first try without retrying for GET', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await apiClient.get<{ id: number }>('/api/test');

      expect(result).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry GET on 500 and succeed on retry', async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Internal Server Error'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { success: true } }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const resultPromise = apiClient.get<{ success: boolean }>('/api/test');

      // Advance past the first retry delay (2^0 * 1000 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should retry GET on TypeError (network error)', async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { recovered: true } }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const resultPromise = apiClient.get<{ recovered: boolean }>('/api/test');

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toEqual({ recovered: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should NOT retry POST on 500', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        apiClient.post('/api/items', { name: 'Test' }),
      ).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry GET on 4xx errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(apiClient.get('/api/test')).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff timing', async () => {
      vi.useFakeTimers();
      const mockFetch = vi.fn().mockImplementation(() => {
        // Always return 500 to force retries
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const resultPromise = apiClient.get('/api/test').catch(() => {});

      // Initial attempt (attempt 0)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // First retry after 2^0 * 1000 = 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second retry after 2^1 * 1000 = 2000ms
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Third retry after 2^2 * 1000 = 4000ms
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      await resultPromise;
      vi.useRealTimers();
    });
  });

  describe('requestRaw', () => {
    it('should return full JSON body without unwrapping data', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ data: [1, 2, 3], meta: { total: 3 } }),
        }),
      );

      const result = await apiClient.getRaw<{
        data: number[];
        meta: { total: number };
      }>('/api/test');

      expect(result).toEqual({ data: [1, 2, 3], meta: { total: 3 } });
    });
  });
});

describe('ApiError', () => {
  it('should have status and message', () => {
    const err = new ApiError(422, 'Validation failed');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(422);
    expect(err.message).toBe('Validation failed');
  });
});
