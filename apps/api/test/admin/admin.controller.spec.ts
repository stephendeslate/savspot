import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminController } from '@/admin/admin.controller';

function makeAdminService() {
  return {
    listTenants: vi.fn(),
    updateTenantStatus: vi.fn(),
    getPlatformMetrics: vi.fn(),
    getSubscriptionOverview: vi.fn(),
    listFeedback: vi.fn(),
    bulkUpdateFeedbackStatus: vi.fn(),
    listSupportTickets: vi.fn(),
    getSupportMetrics: vi.fn(),
  };
}

describe('AdminController', () => {
  let controller: AdminController;
  let service: ReturnType<typeof makeAdminService>;

  beforeEach(() => {
    service = makeAdminService();
    controller = new AdminController(service as never);
  });

  describe('listTenants', () => {
    it('should delegate to adminService.listTenants with query params', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.listTenants.mockResolvedValue(result);

      const query = { search: 'acme', page: 1, limit: 20 };
      const response = await controller.listTenants(query);

      expect(response).toEqual(result);
      expect(service.listTenants).toHaveBeenCalledWith(query);
    });
  });

  describe('updateTenantStatus', () => {
    it('should delegate to adminService.updateTenantStatus', async () => {
      const tenant = { id: 'tenant-001', status: 'SUSPENDED' };
      service.updateTenantStatus.mockResolvedValue(tenant);

      const response = await controller.updateTenantStatus('tenant-001', {
        status: 'SUSPENDED',
      });

      expect(response).toEqual(tenant);
      expect(service.updateTenantStatus).toHaveBeenCalledWith(
        'tenant-001',
        'SUSPENDED',
      );
    });
  });

  describe('getMetrics', () => {
    it('should delegate to adminService.getPlatformMetrics', async () => {
      const metrics = {
        tenants: { total: 10, byStatus: { ACTIVE: 8, SUSPENDED: 2 } },
        bookings: { total: 100, completed: 80 },
        revenue: { total: 5000 },
      };
      service.getPlatformMetrics.mockResolvedValue(metrics);

      const response = await controller.getMetrics();

      expect(response).toEqual(metrics);
      expect(service.getPlatformMetrics).toHaveBeenCalled();
    });
  });

  describe('getSubscriptionOverview', () => {
    it('should delegate to adminService.getSubscriptionOverview', async () => {
      const overview = {
        tierDistribution: { FREE: 5, PRO: 3 },
        mrr: 30,
        recentChurn: 1,
      };
      service.getSubscriptionOverview.mockResolvedValue(overview);

      const response = await controller.getSubscriptionOverview();

      expect(response).toEqual(overview);
      expect(service.getSubscriptionOverview).toHaveBeenCalled();
    });
  });

  describe('listFeedback', () => {
    it('should delegate to adminService.listFeedback with query params', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.listFeedback.mockResolvedValue(result);

      const query = { type: 'FEATURE_REQUEST' as const, page: 1, limit: 20 };
      const response = await controller.listFeedback(query);

      expect(response).toEqual(result);
      expect(service.listFeedback).toHaveBeenCalledWith(query);
    });
  });

  describe('bulkUpdateFeedbackStatus', () => {
    it('should delegate to adminService.bulkUpdateFeedbackStatus', async () => {
      service.bulkUpdateFeedbackStatus.mockResolvedValue({ updated: 3 });

      const dto = { ids: ['id-1', 'id-2', 'id-3'], status: 'ACKNOWLEDGED' as const };
      const response = await controller.bulkUpdateFeedbackStatus(dto);

      expect(response).toEqual({ updated: 3 });
      expect(service.bulkUpdateFeedbackStatus).toHaveBeenCalledWith(dto);
    });
  });

  describe('listSupportTickets', () => {
    it('should delegate to adminService.listSupportTickets with query params', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.listSupportTickets.mockResolvedValue(result);

      const query = { status: 'NEW' as const, page: 1, limit: 20 };
      const response = await controller.listSupportTickets(query);

      expect(response).toEqual(result);
      expect(service.listSupportTickets).toHaveBeenCalledWith(query);
    });
  });

  describe('getSupportMetrics', () => {
    it('should delegate to adminService.getSupportMetrics', async () => {
      const metrics = {
        totalTickets: 50,
        aiResolved: 35,
        aiResolutionRate: 0.7,
        escalationCount: 5,
      };
      service.getSupportMetrics.mockResolvedValue(metrics);

      const response = await controller.getSupportMetrics();

      expect(response).toEqual(metrics);
      expect(service.getSupportMetrics).toHaveBeenCalled();
    });
  });
});
