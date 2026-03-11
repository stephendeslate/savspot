import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface RatesResponse {
  rates: Record<string, number>;
  updatedAt: Date;
  stale: boolean;
}

export interface ConvertResponse {
  convertedAmount: number;
  rate: number;
  stale: boolean;
}

interface CachedRates {
  rates: Record<string, number>;
  updatedAt: string;
}

const CACHE_KEY = 'currency:rates';
const CACHE_TTL_SECONDS = 3600; // 1 hour
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const PERSISTENT_KEY = 'currency:rates:persistent';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  private static readonly SUPPORTED_CURRENCIES: CurrencyInfo[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC', decimals: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3', decimals: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', decimals: 0 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5', decimals: 2 },
    { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', decimals: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimals: 2 },
    { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9', decimals: 0 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
    { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', decimals: 2 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
    { code: 'RUB', name: 'Russian Ruble', symbol: '\u20BD', decimals: 2 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '\u20BA', decimals: 2 },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142', decimals: 2 },
    { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F', decimals: 2 },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0 },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
    { code: 'PHP', name: 'Philippine Peso', symbol: '\u20B1', decimals: 2 },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'K\u010D', decimals: 2 },
    { code: 'ILS', name: 'Israeli New Shekel', symbol: '\u20AA', decimals: 2 },
    { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$', decimals: 0 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2 },
    { code: 'COP', name: 'Colombian Peso', symbol: 'CO$', decimals: 0 },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', decimals: 2 },
    { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', decimals: 2 },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E\u00A3', decimals: 2 },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20A6', decimals: 2 },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimals: 2 },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimals: 2 },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2 },
  ];

  private static readonly SEED_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 149.5,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.1,
    BRL: 4.97,
    MXN: 17.15,
    KRW: 1320,
    SEK: 10.45,
    NOK: 10.55,
    DKK: 6.87,
    NZD: 1.63,
    SGD: 1.34,
    HKD: 7.82,
    TWD: 31.5,
    ZAR: 18.6,
    RUB: 91.5,
    TRY: 30.2,
    PLN: 4.02,
    THB: 35.2,
    IDR: 15450,
    MYR: 4.65,
    PHP: 56.1,
    CZK: 22.8,
    ILS: 3.67,
    CLP: 895,
    AED: 3.67,
    SAR: 3.75,
    COP: 3950,
    PEN: 3.72,
    ARS: 815,
    EGP: 30.9,
    NGN: 1550,
    HUF: 355,
    RON: 4.58,
    BGN: 1.8,
  };

  private static readonly CURRENCY_CODE_SET = new Set(
    CurrencyService.SUPPORTED_CURRENCIES.map((c) => c.code),
  );

  constructor(private readonly redis: RedisService) {}

  async getSupportedCurrencies(): Promise<CurrencyInfo[]> {
    return CurrencyService.SUPPORTED_CURRENCIES;
  }

  async getRates(currencies?: string[]): Promise<RatesResponse> {
    const { rates, updatedAt } = await this.resolveRates();
    const stale = this.isStale(updatedAt);

    if (currencies && currencies.length > 0) {
      const filtered: Record<string, number> = {};
      for (const code of currencies) {
        const upper = code.toUpperCase();
        const rate = rates[upper];
        if (rate !== undefined) {
          filtered[upper] = rate;
        }
      }
      return { rates: filtered, updatedAt, stale };
    }

    return { rates, updatedAt, stale };
  }

  async convert(amount: number, from: string, to: string): Promise<ConvertResponse> {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    if (!CurrencyService.CURRENCY_CODE_SET.has(fromUpper)) {
      throw new BadRequestException(`Unsupported currency: ${fromUpper}`);
    }
    if (!CurrencyService.CURRENCY_CODE_SET.has(toUpper)) {
      throw new BadRequestException(`Unsupported currency: ${toUpper}`);
    }

    const { rates, updatedAt } = await this.resolveRates();
    const stale = this.isStale(updatedAt);

    const fromRate = rates[fromUpper];
    const toRate = rates[toUpper];

    if (fromRate === undefined || toRate === undefined) {
      throw new BadRequestException('Exchange rate unavailable for requested currencies');
    }

    // Convert: amount in 'from' -> USD -> 'to'
    const amountInUsd = amount / fromRate;
    const rate = toRate / fromRate;

    const targetCurrency = CurrencyService.SUPPORTED_CURRENCIES.find(
      (c) => c.code === toUpper,
    );
    const decimals = targetCurrency?.decimals ?? 2;

    const convertedAmount = Number((amountInUsd * toRate).toFixed(decimals));

    return { convertedAmount, rate, stale };
  }

  async refreshRates(): Promise<void> {
    try {
      const rates = await this.fetchExternalRates();
      const cached: CachedRates = {
        rates,
        updatedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(cached);

      await this.redis.setex(CACHE_KEY, CACHE_TTL_SECONDS, json);
      // Also persist without TTL for fallback
      await this.redis.set(PERSISTENT_KEY, json);

      this.logger.log('Exchange rates refreshed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to refresh exchange rates: ${message}`);
    }
  }

  private async resolveRates(): Promise<{ rates: Record<string, number>; updatedAt: Date }> {
    // 1. Try Redis cache
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedRates;
      return { rates: parsed.rates, updatedAt: new Date(parsed.updatedAt) };
    }

    // 2. Try persistent Redis key (survives TTL expiry)
    const persistent = await this.redis.get(PERSISTENT_KEY);
    if (persistent) {
      const parsed = JSON.parse(persistent) as CachedRates;
      return { rates: parsed.rates, updatedAt: new Date(parsed.updatedAt) };
    }

    // 3. Fall back to seed rates
    this.logger.warn('Using seed exchange rates (no cached rates available)');
    return {
      rates: { ...CurrencyService.SEED_RATES },
      updatedAt: new Date(0),
    };
  }

  private async fetchExternalRates(): Promise<Record<string, number>> {
    const apiKey = process.env['OPEN_EXCHANGE_RATES_APP_ID'];

    if (!apiKey || process.env['NODE_ENV'] === 'development' || process.env['NODE_ENV'] === 'test') {
      this.logger.debug('Using seed rates (no external API key configured or dev/test mode)');
      return { ...CurrencyService.SEED_RATES };
    }

    const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=USD`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open Exchange Rates API returned ${response.status}`);
    }

    const data = (await response.json()) as { rates: Record<string, number> };

    // Filter to only supported currencies
    const filtered: Record<string, number> = { USD: 1 };
    for (const currency of CurrencyService.SUPPORTED_CURRENCIES) {
      const rate = data.rates[currency.code];
      if (rate !== undefined) {
        filtered[currency.code] = rate;
      }
    }

    return filtered;
  }

  private isStale(updatedAt: Date): boolean {
    return Date.now() - updatedAt.getTime() > STALE_THRESHOLD_MS;
  }
}
