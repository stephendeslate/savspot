import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommunicationTemplatesService } from '@/communications/communication-templates.service';

vi.mock('@/communications/template-sandbox', () => ({
  sanitizeTemplate: vi.fn(),
}));

vi.mock('@/communications/template-variables', () => ({
  TEMPLATE_VARIABLE_REGISTRY: [
    { name: 'business.name', description: 'Business name', group: 'business' },
    { name: 'client.name', description: 'Client name', group: 'client' },
  ],
}));

import { sanitizeTemplate } from '@/communications/template-sandbox';

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
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    templateHistory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((arr: unknown[]) => Promise.resolve(arr)),
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
    bodyTemplate: 'Hello {{client.name}}, your booking is confirmed.',
    layoutId: null,
    isActive: true,
    sandboxValidated: true,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
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
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new CommunicationTemplatesService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listTemplates
  // -----------------------------------------------------------------------

  describe('listTemplates', () => {
    it('should return paginated templates', async () => {
      const templates = [makeTemplate()];
      prisma.communicationTemplate.findMany.mockResolvedValue(templates);
      prisma.communicationTemplate.count.mockResolvedValue(1);

      const result = await service.listTemplates(TENANT_ID);

      expect(result.data).toEqual(templates);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply channel filter when specified', async () => {
      prisma.communicationTemplate.findMany.mockResolvedValue([]);
      prisma.communicationTemplate.count.mockResolvedValue(0);

      await service.listTemplates(TENANT_ID, { channel: 'SMS' });

      expect(prisma.communicationTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: 'SMS' }),
        }),
      );
    });

    it('should respect custom pagination', async () => {
      prisma.communicationTemplate.findMany.mockResolvedValue([]);
      prisma.communicationTemplate.count.mockResolvedValue(50);

      const result = await service.listTemplates(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.communicationTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(5);
    });
  });

  // -----------------------------------------------------------------------
  // getTemplate
  // -----------------------------------------------------------------------

  describe('getTemplate', () => {
    it('should return template with layout', async () => {
      const template = makeTemplate({ layout: { id: 'layout-1', name: 'Default' } });
      prisma.communicationTemplate.findFirst.mockResolvedValue(template);

      const result = await service.getTemplate(TENANT_ID, TEMPLATE_ID);

      expect(result).toEqual(template);
      expect(prisma.communicationTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEMPLATE_ID, tenantId: TENANT_ID, isActive: true },
          include: { layout: true },
        }),
      );
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.getTemplate(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // createTemplate
  // -----------------------------------------------------------------------

  describe('createTemplate', () => {
    it('should create a template with sanitized body', async () => {
      vi.mocked(sanitizeTemplate).mockReturnValue({ valid: true, errors: [] });
      const created = makeTemplate();
      prisma.communicationTemplate.create.mockResolvedValue(created);

      const result = await service.createTemplate(TENANT_ID, {
        name: 'Booking Confirmation',
        subject: 'Your booking is confirmed',
        body: 'Hello {{client.name}}',
        channel: 'EMAIL',
      });

      expect(sanitizeTemplate).toHaveBeenCalledWith('Hello {{client.name}}');
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException when body fails sanitization', async () => {
      vi.mocked(sanitizeTemplate).mockReturnValue({
        valid: false,
        errors: ['Template contains dangerous construct'],
      });

      await expect(
        service.createTemplate(TENANT_ID, {
          name: 'Bad Template',
          body: '<script>alert("xss")</script>',
          channel: 'EMAIL',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate key from eventType when provided', async () => {
      vi.mocked(sanitizeTemplate).mockReturnValue({ valid: true, errors: [] });
      prisma.communicationTemplate.create.mockResolvedValue(makeTemplate());

      await service.createTemplate(TENANT_ID, {
        name: 'My Template',
        body: 'Body',
        channel: 'EMAIL',
        eventType: 'BOOKING CONFIRMED',
      });

      expect(prisma.communicationTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ key: 'booking-confirmed' }),
        }),
      );
    });

    it('should generate key from name when eventType not provided', async () => {
      vi.mocked(sanitizeTemplate).mockReturnValue({ valid: true, errors: [] });
      prisma.communicationTemplate.create.mockResolvedValue(makeTemplate());

      await service.createTemplate(TENANT_ID, {
        name: 'Welcome Email!!!',
        body: 'Body',
        channel: 'EMAIL',
      });

      expect(prisma.communicationTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ key: 'welcome-email' }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateTemplate
  // -----------------------------------------------------------------------

  describe('updateTemplate', () => {
    it('should update template and create history entry', async () => {
      const existing = makeTemplate();
      prisma.communicationTemplate.findFirst.mockResolvedValue(existing);
      vi.mocked(sanitizeTemplate).mockReturnValue({ valid: true, errors: [] });
      prisma.templateHistory.findFirst.mockResolvedValue({ version: 2 });

      const updated = makeTemplate({ bodyTemplate: 'Updated body' });
      prisma.$transaction.mockResolvedValue([updated]);

      const result = await service.updateTemplate(
        TENANT_ID,
        TEMPLATE_ID,
        { body: 'Updated body', changeReason: 'Fix typo' },
        USER_ID,
      );

      expect(result).toEqual(updated);
      expect(sanitizeTemplate).toHaveBeenCalledWith('Updated body');
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTemplate(TENANT_ID, 'bad-id', { name: 'New' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updated body fails sanitization', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      vi.mocked(sanitizeTemplate).mockReturnValue({
        valid: false,
        errors: ['Dangerous content'],
      });

      await expect(
        service.updateTemplate(
          TENANT_ID,
          TEMPLATE_ID,
          { body: '<script>bad</script>' },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not validate body when body is not being updated', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.templateHistory.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([makeTemplate({ name: 'Renamed' })]);

      await service.updateTemplate(
        TENANT_ID,
        TEMPLATE_ID,
        { name: 'Renamed' },
        USER_ID,
      );

      expect(sanitizeTemplate).not.toHaveBeenCalled();
    });

    it('should start version at 1 when no history exists', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.templateHistory.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([makeTemplate()]);

      await service.updateTemplate(
        TENANT_ID,
        TEMPLATE_ID,
        { name: 'Renamed' },
        USER_ID,
      );

      // $transaction receives an array; second element is history create
      const txArgs = prisma.$transaction.mock.calls[0]![0] as unknown[];
      expect(txArgs).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // deleteTemplate
  // -----------------------------------------------------------------------

  describe('deleteTemplate', () => {
    it('should soft-delete by setting isActive to false', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.communicationTemplate.update.mockResolvedValue({});

      const result = await service.deleteTemplate(TENANT_ID, TEMPLATE_ID);

      expect(result).toEqual({ deleted: true });
      expect(prisma.communicationTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTemplate(TENANT_ID, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getTemplateHistory
  // -----------------------------------------------------------------------

  describe('getTemplateHistory', () => {
    it('should return history entries ordered by version desc', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      const history = [
        { id: 'h2', version: 2, templateId: TEMPLATE_ID },
        { id: 'h1', version: 1, templateId: TEMPLATE_ID },
      ];
      prisma.templateHistory.findMany.mockResolvedValue(history);

      const result = await service.getTemplateHistory(TENANT_ID, TEMPLATE_ID);

      expect(result).toEqual(history);
      expect(prisma.templateHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { templateId: TEMPLATE_ID },
          orderBy: { version: 'desc' },
        }),
      );
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.getTemplateHistory(TENANT_ID, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // rollbackTemplate
  // -----------------------------------------------------------------------

  describe('rollbackTemplate', () => {
    it('should rollback to a previous version and create history entry', async () => {
      prisma.communicationTemplate.findFirst.mockResolvedValue(makeTemplate());
      const historyEntry = {
        id: HISTORY_ID,
        templateId: TEMPLATE_ID,
        version: 1,
        subjectTemplate: 'Old subject',
        bodyTemplate: 'Old body',
      };
      prisma.templateHistory.findFirst
        .mockResolvedValueOnce(historyEntry) // history entry lookup
        .mockResolvedValueOnce({ version: 3 }); // latest version lookup

      const rolledBack = makeTemplate({
        subjectTemplate: 'Old subject',
        bodyTemplate: 'Old body',
      });
      prisma.$transaction.mockResolvedValue([rolledBack]);

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
        service.rollbackTemplate(TENANT_ID, 'bad', HISTORY_ID, USER_ID),
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
      const vars = service.getAvailableVariables();

      expect(vars).toEqual([
        { name: 'business.name', description: 'Business name', group: 'business' },
        { name: 'client.name', description: 'Client name', group: 'client' },
      ]);
    });
  });
});
