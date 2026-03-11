import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommunicationTemplatesService } from '@/communications/communication-templates.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TEMPLATE_ID = 'template-001';
const HISTORY_ID = 'history-001';
const USER_ID = 'user-001';

function makePrisma() {
  return {
    communicationTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    templateHistory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    key: 'booking-confirmation',
    name: 'Booking Confirmation',
    channel: 'EMAIL',
    subjectTemplate: 'Your booking is confirmed',
    bodyTemplate: '<p>Hi {{client.name}}</p>',
    layoutId: null,
    isActive: true,
    isSystem: false,
    sandboxValidated: true,
    validationErrors: null,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CommunicationTemplatesService', () => {
  let service: CommunicationTemplatesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CommunicationTemplatesService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listTemplates
  // -----------------------------------------------------------------------

  describe('listTemplates', () => {
    it('should return paginated results with meta', async () => {
      prisma.communicationTemplate.findMany.mockResolvedValue([makeTemplate()]);
      prisma.communicationTemplate.count.mockResolvedValue(1);

      const result = await service.listTemplates(TENANT_ID);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by channel when provided', async () => {
      prisma.communicationTemplate.findMany.mockResolvedValue([]);
      prisma.communicationTemplate.count.mockResolvedValue(0);

      await service.listTemplates(TENANT_ID, { channel: 'SMS' });

      const where = prisma.communicationTemplate.findMany.mock.calls[0]![0].where;
      expect(where.channel).toBe('SMS');
    });

    it('should apply skip/take for pagination', async () => {
      prisma.communicationTemplate.findMany.mockResolvedValue([]);
      prisma.communicationTemplate.count.mockResolvedValue(0);

      await service.listTemplates(TENANT_ID, { page: 3, limit: 10 });

      const args = prisma.communicationTemplate.findMany.mock.calls[0]![0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });

    it('should only return active templates', async () => {
      prisma.communicationTemplate.findMany.mockResolvedValue([]);
      prisma.communicationTemplate.count.mockResolvedValue(0);

      await service.listTemplates(TENANT_ID);

      const where = prisma.communicationTemplate.findMany.mock.calls[0]![0].where;
      expect(where.isActive).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // getTemplate
  // -----------------------------------------------------------------------

  describe('getTemplate', () => {
    it('should return template when found', async () => {
      const template = makeTemplate();
      prisma.communicationTemplate.findFirst.mockResolvedValue(template);

      const result = await service.getTemplate(TENANT_ID, TEMPLATE_ID);

      expect(result).toEqual(template);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(service.getTemplate(TENANT_ID, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // createTemplate
  // -----------------------------------------------------------------------

  describe('createTemplate', () => {
    it('should create template with valid body', async () => {
      const template = makeTemplate();
      prisma.communicationTemplate.create.mockResolvedValue(template);

      const result = await service.createTemplate(TENANT_ID, {
        name: 'Booking Confirmation',
        subject: 'Your booking is confirmed',
        body: '<p>Hi {{client.name}}</p>',
        channel: 'EMAIL',
      });

      expect(result).toEqual(template);
      expect(prisma.communicationTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Booking Confirmation',
            channel: 'EMAIL',
          }),
        }),
      );
    });

    it('should throw BadRequestException when body contains blocked patterns', async () => {
      await expect(
        service.createTemplate(TENANT_ID, {
          name: 'Bad Template',
          body: '<script>alert("xss")</script>',
          channel: 'EMAIL',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use eventType as key when provided', async () => {
      prisma.communicationTemplate.create.mockResolvedValue(makeTemplate({ key: 'booking.confirmed' }));

      await service.createTemplate(TENANT_ID, {
        name: 'Booking Confirmation',
        body: '<p>Valid</p>',
        channel: 'EMAIL',
        eventType: 'booking.confirmed',
      });

      const data = prisma.communicationTemplate.create.mock.calls[0]![0].data;
      expect(data.key).toBe('booking.confirmed');
    });
  });

  // -----------------------------------------------------------------------
  // updateTemplate
  // -----------------------------------------------------------------------

  describe('updateTemplate', () => {
    it('should update template and create history entry', async () => {
      const existing = makeTemplate();
      prisma.communicationTemplate.findFirst.mockResolvedValue(existing);
      prisma.templateHistory.findFirst.mockResolvedValue({ version: 1 });

      const updated = makeTemplate({ name: 'Updated Name' });
      prisma.$transaction.mockResolvedValue([updated, {}]);

      const result = await service.updateTemplate(
        TENANT_ID,
        TEMPLATE_ID,
        { name: 'Updated Name' },
        USER_ID,
      );

      expect(result).toEqual(updated);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTemplate(TENANT_ID, 'bad-id', { name: 'X' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updated body contains blocked patterns', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());

      await expect(
        service.updateTemplate(
          TENANT_ID,
          TEMPLATE_ID,
          { body: '<script>alert("xss")</script>' },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // deleteTemplate
  // -----------------------------------------------------------------------

  describe('deleteTemplate', () => {
    it('should soft delete by setting isActive=false', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.communicationTemplate.update.mockResolvedValue(makeTemplate({ isActive: false }));

      const result = await service.deleteTemplate(TENANT_ID, TEMPLATE_ID);

      expect(result).toEqual({ deleted: true });
      expect(prisma.communicationTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(service.deleteTemplate(TENANT_ID, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getTemplateHistory
  // -----------------------------------------------------------------------

  describe('getTemplateHistory', () => {
    it('should return history entries ordered by version desc', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      const history = [
        { id: 'h-2', templateId: TEMPLATE_ID, version: 2 },
        { id: 'h-1', templateId: TEMPLATE_ID, version: 1 },
      ];
      prisma.templateHistory.findMany.mockResolvedValue(history);

      const result = await service.getTemplateHistory(TENANT_ID, TEMPLATE_ID);

      expect(result).toEqual(history);
      expect(prisma.templateHistory.findMany).toHaveBeenCalledWith({
        where: { templateId: TEMPLATE_ID },
        orderBy: { version: 'desc' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(service.getTemplateHistory(TENANT_ID, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // rollbackTemplate
  // -----------------------------------------------------------------------

  describe('rollbackTemplate', () => {
    it('should rollback to history entry and create new history version', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.templateHistory.findFirst
        .mockResolvedValueOnce({
          id: HISTORY_ID,
          templateId: TEMPLATE_ID,
          version: 1,
          subjectTemplate: 'Old Subject',
          bodyTemplate: '<p>Old Body</p>',
        })
        .mockResolvedValueOnce({ version: 2 });

      const rolledBack = makeTemplate({
        subjectTemplate: 'Old Subject',
        bodyTemplate: '<p>Old Body</p>',
      });
      prisma.$transaction.mockResolvedValue([rolledBack, {}]);

      const result = await service.rollbackTemplate(
        TENANT_ID,
        TEMPLATE_ID,
        HISTORY_ID,
        USER_ID,
      );

      expect(result).toEqual(rolledBack);
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.rollbackTemplate(TENANT_ID, 'bad-id', HISTORY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when history entry not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.templateHistory.findFirst.mockResolvedValue(null);

      await expect(
        service.rollbackTemplate(TENANT_ID, TEMPLATE_ID, 'bad-history', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getAvailableVariables
  // -----------------------------------------------------------------------

  describe('getAvailableVariables', () => {
    it('should return the template variable registry', () => {
      const variables = service.getAvailableVariables();

      expect(Array.isArray(variables)).toBe(true);
      expect(variables.length).toBeGreaterThan(0);
      expect(variables[0]).toHaveProperty('name');
      expect(variables[0]).toHaveProperty('description');
      expect(variables[0]).toHaveProperty('group');
    });
  });
});
