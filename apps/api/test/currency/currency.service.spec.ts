import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CurrencyService } from '@/currency/currency.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
  };
}

describe('CurrencyService', () => {
  let service: CurrencyService;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    redis = makeRedis();
    service = new CurrencyService(redis as never);
  });

  // ---------- getSupportedCurrencies ----------

  describe('getSupportedCurrencies', () => {
    it('returns a non-empty array of supported currencies', async () => {
      const currencies = await service.getSupportedCurrencies();

      expect(currencies.length).toBeGreaterThan(0);
      expect(currencies[0]).toHaveProperty('code');
      expect(currencies[0]).toHaveProperty('symbol');
      expect(currencies[0]).toHaveProperty('decimals');
    });

    it('includes USD', async () => {
      const currencies = await service.getSupportedCurrencies();
      const usd = currencies.find((c) => c.code === 'USD');
      expect(usd).toBeDefined();
      expect(usd!.symbol).toBe('$');
    });
  });

  // ---------- getRates ----------

  describe('getRates', () => {
    it('returns all rates from cache', async () => {
      const cached = JSON.stringify({
        rates: { USD: 1, EUR: 0.92 },
        updatedAt: new Date().toISOString(),
      });
      redis.get.mockResolvedValue(cached);

      const result = await service.getRates();

      expect(result.rates.USD).toBe(1);
      expect(result.rates.EUR).toBe(0.92);
      expect(result.stale).toBe(false);
    });

    it('filters rates when currencies param provided', async () => {
      const cached = JSON.stringify({
        rates: { USD: 1, EUR: 0.92, GBP: 0.79 },
        updatedAt: new Date().toISOString(),
      });
      redis.get.mockResolvedValue(cached);

      const result = await service.getRates(['USD', 'GBP']);

      expect(Object.keys(result.rates)).toEqual(['USD', 'GBP']);
      expect(result.rates['EUR']).toBeUndefined();
    });

    it('falls back to seed rates when no cache available', async () => {
      redis.get.mockResolvedValue(null); // no cache, no persistent

      const result = await service.getRates();

      expect(result.rates.USD).toBe(1);
      expect(result.stale).toBe(true); // epoch date is always stale
    });

    it('uses persistent key when primary cache expired', async () => {
      redis.get
        .mockResolvedValueOnce(null) // primary cache miss
        .mockResolvedValueOnce(
          JSON.stringify({
            rates: { USD: 1, EUR: 0.91 },
            updatedAt: new Date().toISOString(),
          }),
        ); // persistent hit

      const result = await service.getRates();

      expect(result.rates.EUR).toBe(0.91);
    });

    it('marks rates as stale when older than 24 hours', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      redis.get.mockResolvedValue(
        JSON.stringify({ rates: { USD: 1 }, updatedAt: oldDate }),
      );

      const result = await service.getRates();

      expect(result.stale).toBe(true);
    });

    it('is case-insensitive for currency filter', async () => {
      const cached = JSON.stringify({
        rates: { USD: 1, EUR: 0.92 },
        updatedAt: new Date().toISOString(),
      });
      redis.get.mockResolvedValue(cached);

      const result = await service.getRates(['usd', 'eur']);

      expect(result.rates['USD']).toBe(1);
      expect(result.rates['EUR']).toBe(0.92);
    });
  });

  // ---------- convert ----------

  describe('convert', () => {
    beforeEach(() => {
      redis.get.mockResolvedValue(null); // will use seed rates
    });

    it('converts between two currencies', async () => {
      const result = await service.convert(100, 'USD', 'EUR');

      expect(result.convertedAmount).toBe(92);
      expect(result.rate).toBeCloseTo(0.92);
    });

    it('converts to zero-decimal currency (JPY)', async () => {
      const result = await service.convert(1, 'USD', 'JPY');

      expect(result.convertedAmount).toBe(150); // 149.5 rounded to 0 decimals
    });

    it('same currency conversion returns same amount', async () => {
      const result = await service.convert(42.50, 'USD', 'USD');

      expect(result.convertedAmount).toBe(42.50);
      expect(result.rate).toBe(1);
    });

    it('throws BadRequestException for unsupported from currency', async () => {
      await expect(service.convert(100, 'XYZ', 'USD')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for unsupported to currency', async () => {
      await expect(service.convert(100, 'USD', 'XYZ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('is case-insensitive', async () => {
      const result = await service.convert(100, 'usd', 'eur');

      expect(result.convertedAmount).toBe(92);
    });
  });

  // ---------- refreshRates ----------

  describe('refreshRates', () => {
    it('writes seed rates to both cache keys in test mode', async () => {
      await service.refreshRates();

      expect(redis.setex).toHaveBeenCalledWith(
        'currency:rates',
        3600,
        expect.any(String),
      );
      expect(redis.set).toHaveBeenCalledWith(
        'currency:rates:persistent',
        expect.any(String),
      );
    });

    it('does not throw when redis write fails', async () => {
      redis.setex.mockRejectedValue(new Error('Redis down'));

      await expect(service.refreshRates()).resolves.toBeUndefined();
    });
  });
});
