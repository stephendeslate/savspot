import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SavedBusinessesService } from '@/directory/saved-businesses.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    savedBusiness: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SavedBusinessesService', () => {
  let service: SavedBusinessesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SavedBusinessesService(prisma as never);
  });

  // ---------- toggleSave ----------

  describe('toggleSave', () => {
    it('should save business when not already saved', async () => {
      prisma.savedBusiness.findUnique.mockResolvedValue(null);
      prisma.savedBusiness.create.mockResolvedValue({
        id: 'saved-001',
        userId: USER_ID,
        tenantId: TENANT_ID,
      });

      const result = await service.toggleSave(USER_ID, TENANT_ID);

      expect(result).toEqual({ saved: true });
      expect(prisma.savedBusiness.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, tenantId: TENANT_ID },
      });
    });

    it('should unsave business when already saved', async () => {
      prisma.savedBusiness.findUnique.mockResolvedValue({
        id: 'saved-001',
        userId: USER_ID,
        tenantId: TENANT_ID,
      });
      prisma.savedBusiness.delete.mockResolvedValue({});

      const result = await service.toggleSave(USER_ID, TENANT_ID);

      expect(result).toEqual({ saved: false });
      expect(prisma.savedBusiness.delete).toHaveBeenCalledWith({
        where: { id: 'saved-001' },
      });
    });

    it('should look up by composite key', async () => {
      prisma.savedBusiness.findUnique.mockResolvedValue(null);
      prisma.savedBusiness.create.mockResolvedValue({});

      await service.toggleSave(USER_ID, TENANT_ID);

      expect(prisma.savedBusiness.findUnique).toHaveBeenCalledWith({
        where: { userId_tenantId: { userId: USER_ID, tenantId: TENANT_ID } },
      });
    });
  });

  // ---------- listSaved ----------

  describe('listSaved', () => {
    it('should return saved businesses with tenant info', async () => {
      prisma.savedBusiness.findMany.mockResolvedValue([
        {
          id: 'saved-001',
          userId: USER_ID,
          tenantId: TENANT_ID,
          tenant: { id: TENANT_ID, name: 'Cool Salon', slug: 'cool-salon' },
        },
      ]);

      const result = await service.listSaved(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.tenant.name).toBe('Cool Salon');
    });

    it('should include tenant select fields', async () => {
      prisma.savedBusiness.findMany.mockResolvedValue([]);

      await service.listSaved(USER_ID);

      expect(prisma.savedBusiness.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: true,
                logoUrl: true,
                address: true,
              },
            },
          },
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      prisma.savedBusiness.findMany.mockResolvedValue([]);

      await service.listSaved(USER_ID);

      expect(prisma.savedBusiness.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array when no saved businesses', async () => {
      prisma.savedBusiness.findMany.mockResolvedValue([]);

      const result = await service.listSaved(USER_ID);

      expect(result).toEqual([]);
    });
  });
});
