import { describe, it, expect, vi, afterEach } from 'vitest';
import sitemap from '../sitemap';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sitemap', () => {
  it('should return static pages when API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    const result = await sitemap();

    expect(result.length).toBeGreaterThanOrEqual(3);
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain('https://savspot.com');
    expect(urls.some((u) => u.includes('/login'))).toBe(true);
    expect(urls.some((u) => u.includes('/register'))).toBe(true);
  });

  it('should include booking pages when API returns slugs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(['test-salon', 'janes-spa']),
      }),
    );

    const result = await sitemap();

    const urls = result.map((entry) => entry.url);
    expect(urls).toContain('https://savspot.com/book/test-salon');
    expect(urls).toContain('https://savspot.com/book/janes-spa');
    // Static pages should still be included
    expect(urls).toContain('https://savspot.com');
  });

  it('should fallback to static pages when API returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const result = await sitemap();

    // Should only have static pages (6: home, login, register, directory, privacy, terms)
    expect(result.length).toBe(6);
  });

  it('should set correct change frequencies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(['salon-a']),
      }),
    );

    const result = await sitemap();

    const staticEntry = result.find((e) => e.url === 'https://savspot.com');
    expect(staticEntry?.changeFrequency).toBe('monthly');

    const bookingEntry = result.find((e) =>
      e.url.includes('/book/salon-a'),
    );
    expect(bookingEntry?.changeFrequency).toBe('weekly');
  });

  it('should set lastModified dates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('fail')),
    );

    const result = await sitemap();

    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});
