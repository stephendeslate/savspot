import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GalleryService } from '@/gallery/gallery.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const PHOTO_ID = 'photo-001';

function makePrisma() {
  return {
    galleryPhoto: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makePhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: PHOTO_ID,
    tenantId: TENANT_ID,
    url: 'https://cdn.example.com/photo.jpg',
    thumbnailUrl: null,
    altText: null,
    caption: null,
    category: null,
    venueId: null,
    serviceId: null,
    isFeatured: false,
    sortOrder: 0,
    width: null,
    height: null,
    fileSize: null,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GalleryService', () => {
  let service: GalleryService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new GalleryService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return photos for the tenant ordered by sortOrder', async () => {
      const photos = [makePhoto(), makePhoto({ id: 'photo-002', sortOrder: 1 })];
      prisma.galleryPhoto.findMany.mockResolvedValue(photos);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual(photos);
      expect(prisma.galleryPhoto.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should apply venueId filter when provided', async () => {
      prisma.galleryPhoto.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, { venueId: 'venue-001' });

      expect(prisma.galleryPhoto.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, venueId: 'venue-001' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should apply serviceId filter when provided', async () => {
      prisma.galleryPhoto.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, { serviceId: 'service-001' });

      expect(prisma.galleryPhoto.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, serviceId: 'service-001' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should apply category filter when provided', async () => {
      prisma.galleryPhoto.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, { category: 'PORTFOLIO' });

      expect(prisma.galleryPhoto.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, category: 'PORTFOLIO' },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should create a photo with required fields', async () => {
      const photo = makePhoto();
      prisma.galleryPhoto.create.mockResolvedValue(photo);

      const result = await service.create(TENANT_ID, {
        url: 'https://cdn.example.com/photo.jpg',
      });

      expect(result).toEqual(photo);
      expect(prisma.galleryPhoto.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          url: 'https://cdn.example.com/photo.jpg',
          thumbnailUrl: null,
          altText: null,
          caption: null,
          category: null,
          venueId: null,
          serviceId: null,
          isFeatured: false,
          sortOrder: 0,
          width: null,
          height: null,
          fileSize: null,
        },
      });
    });

    it('should pass all optional fields when provided', async () => {
      prisma.galleryPhoto.create.mockResolvedValue(
        makePhoto({ altText: 'A haircut', isFeatured: true }),
      );

      await service.create(TENANT_ID, {
        url: 'https://cdn.example.com/photo.jpg',
        altText: 'A haircut',
        caption: 'Great cut',
        category: 'PORTFOLIO',
        isFeatured: true,
        sortOrder: 5,
        width: 1920,
        height: 1080,
        fileSize: 250000,
      });

      expect(prisma.galleryPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          altText: 'A haircut',
          caption: 'Great cut',
          category: 'PORTFOLIO',
          isFeatured: true,
          sortOrder: 5,
          width: 1920,
          height: 1080,
          fileSize: 250000,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update an existing photo', async () => {
      prisma.galleryPhoto.findFirst.mockResolvedValue(makePhoto());
      const updated = makePhoto({ caption: 'Updated caption' });
      prisma.galleryPhoto.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, PHOTO_ID, {
        caption: 'Updated caption',
      });

      expect(result).toEqual(updated);
      expect(prisma.galleryPhoto.update).toHaveBeenCalledWith({
        where: { id: PHOTO_ID },
        data: { caption: 'Updated caption' },
      });
    });

    it('should throw NotFoundException for non-existent photo', async () => {
      prisma.galleryPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nonexistent', { caption: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('should hard delete the photo', async () => {
      prisma.galleryPhoto.findFirst.mockResolvedValue(makePhoto());
      prisma.galleryPhoto.delete.mockResolvedValue(makePhoto());

      await service.remove(TENANT_ID, PHOTO_ID);

      expect(prisma.galleryPhoto.delete).toHaveBeenCalledWith({
        where: { id: PHOTO_ID },
      });
    });

    it('should throw NotFoundException for non-existent photo', async () => {
      prisma.galleryPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
