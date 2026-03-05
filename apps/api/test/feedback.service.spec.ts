import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from '@/feedback/feedback.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const FEEDBACK_ID = 'feedback-001';

function makePrisma() {
  return {
    feedback: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };
}

function makeFeedback(overrides: Record<string, unknown> = {}) {
  return {
    id: FEEDBACK_ID,
    tenantId: TENANT_ID,
    submittedBy: USER_ID,
    type: 'FEATURE_REQUEST',
    body: 'Please add dark mode',
    contextPage: '/dashboard/settings',
    screenshotUrl: null,
    status: 'NEW',
    developerNotes: null,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FeedbackService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // submitFeedback
  // -----------------------------------------------------------------------

  describe('submitFeedback', () => {
    it('should store correct fields', async () => {
      const created = makeFeedback();
      prisma.feedback.create.mockResolvedValue(created);

      const result = await service.submitFeedback(TENANT_ID, USER_ID, {
        type: 'FEATURE_REQUEST',
        body: 'Please add dark mode',
        contextPage: '/dashboard/settings',
      });

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          submittedBy: USER_ID,
          type: 'FEATURE_REQUEST',
          body: 'Please add dark mode',
          contextPage: '/dashboard/settings',
          screenshotUrl: null,
          status: 'NEW',
        },
      });
      expect(result.id).toBe(FEEDBACK_ID);
      expect(result.type).toBe('FEATURE_REQUEST');
      expect(result.body).toBe('Please add dark mode');
      expect(result.contextPage).toBe('/dashboard/settings');
    });

    it('should default status to NEW', async () => {
      const created = makeFeedback();
      prisma.feedback.create.mockResolvedValue(created);

      const result = await service.submitFeedback(TENANT_ID, USER_ID, {
        type: 'GENERAL',
        body: 'Some general feedback',
      });

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'NEW',
        }),
      });
      expect(result.status).toBe('NEW');
    });

    it('should handle optional screenshotUrl', async () => {
      const created = makeFeedback({
        screenshotUrl: 'https://cdn.example.com/shot.png',
      });
      prisma.feedback.create.mockResolvedValue(created);

      const result = await service.submitFeedback(TENANT_ID, USER_ID, {
        type: 'UX_FRICTION',
        body: 'Button is hard to find',
        screenshotUrl: 'https://cdn.example.com/shot.png',
      });

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          screenshotUrl: 'https://cdn.example.com/shot.png',
        }),
      });
      expect(result.screenshotUrl).toBe('https://cdn.example.com/shot.png');
    });

    it('should default contextPage and screenshotUrl to null when not provided', async () => {
      const created = makeFeedback({ contextPage: null, screenshotUrl: null });
      prisma.feedback.create.mockResolvedValue(created);

      await service.submitFeedback(TENANT_ID, USER_ID, {
        type: 'GENERAL',
        body: 'Feedback without context',
      });

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contextPage: null,
          screenshotUrl: null,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // listFeedback
  // -----------------------------------------------------------------------

  describe('listFeedback', () => {
    it('should return all feedback for tenant ordered by createdAt desc', async () => {
      const feedbackList = [
        makeFeedback({ id: 'fb-1', createdAt: new Date('2026-03-03T10:00:00Z') }),
        makeFeedback({ id: 'fb-2', createdAt: new Date('2026-03-02T10:00:00Z') }),
        makeFeedback({ id: 'fb-3', createdAt: new Date('2026-03-01T10:00:00Z') }),
      ];
      prisma.feedback.findMany.mockResolvedValue(feedbackList);

      const result = await service.listFeedback(TENANT_ID);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0]!.id).toBe('fb-1');
    });

    it('should return empty array when no feedback exists', async () => {
      prisma.feedback.findMany.mockResolvedValue([]);

      const result = await service.listFeedback(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getFeedback
  // -----------------------------------------------------------------------

  describe('getFeedback', () => {
    it('should return single feedback record', async () => {
      const feedback = makeFeedback();
      prisma.feedback.findFirst.mockResolvedValue(feedback);

      const result = await service.getFeedback(TENANT_ID, FEEDBACK_ID);

      expect(prisma.feedback.findFirst).toHaveBeenCalledWith({
        where: { id: FEEDBACK_ID, tenantId: TENANT_ID },
      });
      expect(result.id).toBe(FEEDBACK_ID);
      expect(result.type).toBe('FEATURE_REQUEST');
      expect(result.body).toBe('Please add dark mode');
    });

    it('should throw NotFoundException for unknown feedback', async () => {
      prisma.feedback.findFirst.mockResolvedValue(null);

      await expect(
        service.getFeedback(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
