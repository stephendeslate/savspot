import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

let apiClient: typeof import('../api-client').apiClient;
let ApiError: typeof import('../api-client').ApiError;

beforeEach(async () => {
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
  describe('request', () => {
    it('should make a fetch request with credentials included', async () => {
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
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
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
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized'),
          });
        }
        if ((url as string).includes('/api/auth/refresh')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { success: true } }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await apiClient.get<{ success: boolean }>('/api/test');

      expect(result).toEqual({ success: true });
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
          credentials: 'include',
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
          credentials: 'include',
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
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        }),
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
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const resultPromise = apiClient.get('/api/test').catch(() => {});

      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

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
