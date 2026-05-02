import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TicketCategory, TicketSeverity, TicketStatus, ResolvedBy } from '../../../../prisma/generated/prisma';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JobDispatcher } from '../bullmq/job-dispatcher.service';
import { QUEUE_COMMUNICATIONS, JOB_SUPPORT_TRIAGE } from '../bullmq/queue.constants';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: JobDispatcher,
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
        category: dto.category as TicketCategory,
        severity: (dto.severity as TicketSeverity) ?? TicketSeverity.MEDIUM,
        subject: dto.subject,
        body: dto.body,
        status: 'NEW',
        sourceContext: dto.sourceContext ? (dto.sourceContext as object) : undefined,
      },
    });

    this.logger.log(
      `Support ticket ${ticket.id} created by user ${userId}`,
    );

    // Enqueue AI triage job (routes to BullMQ or Inngest per QUEUE_COMMUNICATIONS_PROVIDER).
    this.dispatcher
      .dispatch(
        QUEUE_COMMUNICATIONS,
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

  /**
   * Reopen a RESOLVED or CLOSED ticket by creating a new linked ticket.
   */
  async reopenTicket(userId: string, ticketId: string, reason?: string) {
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

    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      throw new BadRequestException(
        'Only RESOLVED or CLOSED tickets can be reopened',
      );
    }

    const newTicket = await this.prisma.supportTicket.create({
      data: {
        submittedBy: userId,
        tenantId: ticket.tenantId,
        category: ticket.category,
        severity: ticket.severity,
        subject: `Re: ${ticket.subject}`,
        body: reason || `Reopened from ticket ${ticket.id}`,
        status: 'NEW',
        relatedTicketId: ticket.id,
      },
    });

    this.logger.log(
      `Support ticket ${newTicket.id} created as reopen of ${ticketId} by user ${userId}`,
    );

    // Enqueue AI triage job for the new ticket
    this.dispatcher
      .dispatch(
        QUEUE_COMMUNICATIONS,
        JOB_SUPPORT_TRIAGE,
        { ticketId: newTicket.id },
        { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
      )
      .catch((err) =>
        this.logger.warn(`Failed to enqueue triage for ticket ${newTicket.id}: ${err.message}`),
      );

    return newTicket;
  }

  /**
   * Set user satisfaction on a resolved/closed ticket.
   */
  async setSatisfaction(userId: string, ticketId: string, helpful: boolean) {
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

    if (
      ticket.status !== 'RESOLVED' &&
      ticket.status !== 'CLOSED' &&
      ticket.status !== 'AI_RESOLVED'
    ) {
      throw new BadRequestException(
        'Satisfaction can only be set on resolved tickets',
      );
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { userSatisfaction: helpful },
    });
  }

  /**
   * Admin: List all tickets with optional status/severity filters.
   */
  async adminListTickets(filters: { status?: string; severity?: string }) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (filters.status) {
      where.status = filters.status as TicketStatus;
    }
    if (filters.severity) {
      where.severity = filters.severity as TicketSeverity;
    }

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submitter: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Admin: Update ticket status and developer notes.
   */
  async adminUpdateTicket(
    ticketId: string,
    data: { status?: string; developerNotes?: string },
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updateData: Prisma.SupportTicketUpdateInput = {};
    if (data.status !== undefined) {
      updateData.status = data.status as TicketStatus;
      if (
        (data.status === 'RESOLVED' || data.status === 'CLOSED') &&
        !ticket.resolvedAt
      ) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = ResolvedBy.DEVELOPER;
      }
    }
    if (data.developerNotes !== undefined) {
      updateData.developerNotes = data.developerNotes;
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });
  }
}
