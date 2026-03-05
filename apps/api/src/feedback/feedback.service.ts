import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FeedbackType } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit feedback from a user. Status defaults to NEW.
   */
  async submitFeedback(
    tenantId: string,
    userId: string,
    dto: CreateFeedbackDto,
  ) {
    const feedback = await this.prisma.feedback.create({
      data: {
        tenantId,
        submittedBy: userId,
        type: dto.type as FeedbackType,
        body: dto.body,
        contextPage: dto.contextPage ?? null,
        screenshotUrl: dto.screenshotUrl ?? null,
        status: 'NEW',
      },
    });

    this.logger.log(
      `Feedback ${feedback.id} submitted by ${userId} (type: ${dto.type})`,
    );

    return feedback;
  }

  /**
   * List all feedback for a tenant, ordered by createdAt desc (admin view).
   */
  async listFeedback(tenantId: string) {
    return this.prisma.feedback.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single feedback entry by ID.
   */
  async getFeedback(tenantId: string, feedbackId: string) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { id: feedbackId, tenantId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }
}
