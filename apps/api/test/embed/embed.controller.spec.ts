import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbedController } from '@/embed/embed.controller';

function makeMockService() {
  return {
    getWidgetConfig: vi.fn(),
    getAvailableServices: vi.fn(),
    getAvailability: vi.fn(),
    createBookingSession: vi.fn(),
  };
}

describe('EmbedController', () => {
  let controller: EmbedController;
  let service: ReturnType<typeof makeMockService>;

  beforeEach(() => {
    service = makeMockService();
    controller = new EmbedController(service as never);
  });

  describe('GET /embed/:slug/config', () => {
    it('should return widget config', async () => {
      const config = { name: 'Acme', slug: 'acme', allowedModes: ['button'] };
      service.getWidgetConfig.mockResolvedValue(config);

      const result = await controller.getWidgetConfig('acme');
      expect(result).toEqual(config);
      expect(service.getWidgetConfig).toHaveBeenCalledWith('acme');
    });
  });

  describe('GET /embed/:slug/services', () => {
    it('should return available services', async () => {
      const services = [{ id: 's1', name: 'Haircut' }];
      service.getAvailableServices.mockResolvedValue(services);

      const result = await controller.getAvailableServices('acme');
      expect(result).toEqual(services);
      expect(service.getAvailableServices).toHaveBeenCalledWith('acme');
    });
  });

  describe('GET /embed/:slug/availability', () => {
    it('should return available slots', async () => {
      const slots = [{ date: '2026-03-15', startTime: '09:00', endTime: '10:00' }];
      service.getAvailability.mockResolvedValue(slots);

      const query = { serviceId: 'service-001', date: '2026-03-15' };
      const result = await controller.getAvailability('acme', query);
      expect(result).toEqual(slots);
      expect(service.getAvailability).toHaveBeenCalledWith('acme', 'service-001', '2026-03-15');
    });
  });

  describe('POST /embed/:slug/session', () => {
    it('should create a booking session', async () => {
      const session = { id: 'sess-1', status: 'IN_PROGRESS' };
      service.createBookingSession.mockResolvedValue(session);

      const dto = {
        serviceId: 'service-001',
        clientEmail: 'test@example.com',
        clientName: 'Test User',
      };
      const result = await controller.createBookingSession('acme', dto);
      expect(result).toEqual(session);
      expect(service.createBookingSession).toHaveBeenCalledWith('acme', dto);
    });
  });
});
