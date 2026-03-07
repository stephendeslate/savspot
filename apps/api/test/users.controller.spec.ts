import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersController } from '@/users/users.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

const makeService = () => ({
  findById: vi.fn(),
  update: vi.fn(),
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('UsersController', () => {
  let controller: UsersController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new UsersController(service as never);
  });

  // -----------------------------------------------------------------------
  // getProfile (GET /users/me)
  // -----------------------------------------------------------------------

  describe('getProfile', () => {
    it('should call service.findById with userId and return the result', async () => {
      const user = { id: USER_ID, email: 'test@example.com', name: 'Test User' };
      service.findById.mockResolvedValue(user);

      const result = await controller.getProfile(USER_ID);

      expect(service.findById).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(user);
    });

    it('should forward service errors', async () => {
      service.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.getProfile(USER_ID)).rejects.toThrow('Not found');
    });
  });

  // -----------------------------------------------------------------------
  // updateProfile (PATCH /users/me)
  // -----------------------------------------------------------------------

  describe('updateProfile', () => {
    it('should call service.update with userId and dto', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { id: USER_ID, name: 'Updated Name' };
      service.update.mockResolvedValue(updated);

      const result = await controller.updateProfile(USER_ID, dto as never);

      expect(service.update).toHaveBeenCalledWith(USER_ID, dto);
      expect(result).toEqual(updated);
    });

    it('should pass partial update dto', async () => {
      const dto = { phone: '+1234567890' };
      service.update.mockResolvedValue({ id: USER_ID, ...dto });

      await controller.updateProfile(USER_ID, dto as never);

      expect(service.update).toHaveBeenCalledWith(USER_ID, dto);
    });
  });

  // -----------------------------------------------------------------------
  // getNotificationPreferences (GET /users/me/notification-preferences)
  // -----------------------------------------------------------------------

  describe('getNotificationPreferences', () => {
    it('should call service.getNotificationPreferences with userId', async () => {
      const prefs = { emailBookingConfirm: true, smsReminder: false };
      service.getNotificationPreferences.mockResolvedValue(prefs);

      const result = await controller.getNotificationPreferences(USER_ID);

      expect(service.getNotificationPreferences).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(prefs);
    });
  });

  // -----------------------------------------------------------------------
  // updateNotificationPreferences (PUT /users/me/notification-preferences)
  // -----------------------------------------------------------------------

  describe('updateNotificationPreferences', () => {
    it('should call service.updateNotificationPreferences with userId and body', async () => {
      const body = { emailBookingConfirm: false, smsReminder: true };
      const updated = { ...body };
      service.updateNotificationPreferences.mockResolvedValue(updated);

      const result = await controller.updateNotificationPreferences(USER_ID, body);

      expect(service.updateNotificationPreferences).toHaveBeenCalledWith(USER_ID, body);
      expect(result).toEqual(updated);
    });

    it('should accept Record<string, unknown> body type', async () => {
      const body: Record<string, unknown> = { customKey: 'value', nested: { a: 1 } };
      service.updateNotificationPreferences.mockResolvedValue(body);

      const result = await controller.updateNotificationPreferences(USER_ID, body);

      expect(service.updateNotificationPreferences).toHaveBeenCalledWith(USER_ID, body);
      expect(result).toEqual(body);
    });
  });
});
