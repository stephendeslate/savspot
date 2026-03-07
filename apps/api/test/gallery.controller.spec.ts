import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryController } from '@/gallery/gallery.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const PHOTO_ID = 'photo-001';

const makeService = () => ({
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GalleryController', () => {
  let controller: GalleryController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new GalleryController(service as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should call service.findAll with tenantId and empty filters when no query params', async () => {
      const photos = [{ id: PHOTO_ID }];
      service.findAll.mockResolvedValue(photos);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        venueId: undefined,
        serviceId: undefined,
        category: undefined,
      });
      expect(result).toEqual(photos);
    });

    it('should pass venueId filter when provided', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(TENANT_ID, 'venue-1');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        venueId: 'venue-1',
        serviceId: undefined,
        category: undefined,
      });
    });

    it('should pass serviceId filter when provided', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(TENANT_ID, undefined, 'service-1');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        venueId: undefined,
        serviceId: 'service-1',
        category: undefined,
      });
    });

    it('should pass category filter when provided', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(TENANT_ID, undefined, undefined, 'PORTFOLIO');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        venueId: undefined,
        serviceId: undefined,
        category: 'PORTFOLIO',
      });
    });

    it('should pass all filters when all query params provided', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(TENANT_ID, 'venue-1', 'service-1', 'PORTFOLIO');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        venueId: 'venue-1',
        serviceId: 'service-1',
        category: 'PORTFOLIO',
      });
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should call service.create with tenantId and dto', async () => {
      const dto = { url: 'https://example.com/photo.jpg', caption: 'Test' };
      const created = { id: PHOTO_ID, ...dto };
      service.create.mockResolvedValue(created);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(created);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should call service.update with tenantId, id, and dto', async () => {
      const dto = { caption: 'Updated caption' };
      const updated = { id: PHOTO_ID, caption: 'Updated caption' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(TENANT_ID, PHOTO_ID, dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, PHOTO_ID, dto);
      expect(result).toEqual(updated);
    });
  });

  // -----------------------------------------------------------------------
  // remove (returns void / 204)
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('should call service.remove with tenantId and id and return void', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(TENANT_ID, PHOTO_ID);

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, PHOTO_ID);
      expect(result).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------

  describe('tenant isolation', () => {
    it('should pass different tenant IDs independently', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('tenant-A');
      await controller.findAll('tenant-B');

      expect(service.findAll).toHaveBeenCalledWith('tenant-A', expect.any(Object));
      expect(service.findAll).toHaveBeenCalledWith('tenant-B', expect.any(Object));
    });
  });
});
