import { describe, it, expect } from 'vitest';
import robots from '../robots';

describe('robots', () => {
  it('should return robots config with rules', () => {
    const config = robots();

    expect(config.rules).toBeDefined();
  });

  it('should allow all user agents', () => {
    const config = robots();
    const rules = config.rules as { userAgent: string; allow: string; disallow: string[] };

    expect(rules.userAgent).toBe('*');
  });

  it('should allow root path', () => {
    const config = robots();
    const rules = config.rules as { allow: string };

    expect(rules.allow).toBe('/');
  });

  it('should disallow sensitive paths', () => {
    const config = robots();
    const rules = config.rules as { disallow: string[] };

    expect(rules.disallow).toContain('/api/');
    expect(rules.disallow).toContain('/dashboard/');
    expect(rules.disallow).toContain('/settings/');
    expect(rules.disallow).toContain('/portal/');
  });

  it('should include sitemap URL', () => {
    const config = robots();

    expect(config.sitemap).toContain('/sitemap.xml');
  });
});
