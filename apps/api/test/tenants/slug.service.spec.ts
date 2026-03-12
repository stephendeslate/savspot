import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlugService } from '@/tenants/slug.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SlugService', () => {
  let service: SlugService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SlugService(prisma as never);
  });

  describe('generateSlug', () => {
    it('should convert name to lowercase hyphenated slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug('My Cool Business');

      expect(slug).toBe('my-cool-business');
    });

    it('should strip special characters', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug("Jane's Salon & Spa!");

      expect(slug).toBe('janes-salon-spa');
    });

    it('should collapse consecutive hyphens', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug('Hello---World');

      expect(slug).toBe('hello-world');
    });

    it('should replace underscores with hyphens', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug('my_business_name');

      expect(slug).toBe('my-business-name');
    });

    it('should trim leading and trailing hyphens', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug('-test-');

      expect(slug).toBe('test');
    });

    it('should fallback to "tenant" for empty result', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug('!!!');

      expect(slug).toBe('tenant');
    });

    it('should append suffix when slug already exists', async () => {
      prisma.tenant.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // base slug taken
        .mockResolvedValueOnce(null); // slug-2 available

      const slug = await service.generateSlug('Taken Name');

      expect(slug).toBe('taken-name-2');
    });

    it('should increment suffix until available', async () => {
      prisma.tenant.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // base taken
        .mockResolvedValueOnce({ id: 'existing' }) // -2 taken
        .mockResolvedValueOnce({ id: 'existing' }) // -3 taken
        .mockResolvedValueOnce(null); // -4 available

      const slug = await service.generateSlug('Popular');

      expect(slug).toBe('popular-4');
    });
  });
});
