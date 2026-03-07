import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QUEUE_COMMUNICATIONS, JOB_SUPPORT_TRIAGE } from '../bullmq/queue.constants';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  /**
   * Create a new support ticket for the authenticated user.
   */
  async createTicket(
    userId: string,
    tenantId: string | null,
    dto: CreateTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        submittedBy: userId,
        tenantId: tenantId ?? null,
        category: dto.category as never,
        severity: (dto.severity as never) ?? 'MEDIUM',
        subject: dto.subject,
        body: dto.body,
        status: 'NEW',
        sourceContext: dto.sourceContext ? (dto.sourceContext as object) : undefined,
      },
    });

    this.logger.log(
      `Support ticket ${ticket.id} created by user ${userId}`,
    );

    // Enqueue AI triage job
    this.commsQueue
      .add(
        JOB_SUPPORT_TRIAGE,
        { ticketId: ticket.id },
        { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
      )
      .catch((err) =>
        this.logger.warn(`Failed to enqueue triage for ticket ${ticket.id}: ${err.message}`),
      );

    return ticket;
  }

  /**
   * List all support tickets submitted by the authenticated user,
   * ordered by createdAt descending.
   */
  async listTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { submittedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single support ticket by ID.
   * Verifies that the authenticated user is the submitter.
   */
  async getTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (ticket.submittedBy !== userId) {
      throw new ForbiddenException(
        'You do not have access to this support ticket',
      );
    }

    return ticket;
  }
}
