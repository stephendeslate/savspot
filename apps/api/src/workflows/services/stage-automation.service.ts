import { Injectable, Logger } from '@nestjs/common';
import { CommunicationsService } from '../../communications/communications.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

interface StageExecutionContext {
  tenantId: string;
  bookingId: string | null;
  eventPayload: Record<string, unknown>;
}

@Injectable()
export class StageAutomationService {
  private readonly logger = new Logger(StageAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async executeStage(
    stage: {
      id: string;
      automationType: string;
      automationConfig: unknown;
      name: string;
    },
    context: StageExecutionContext,
  ): Promise<{ success: boolean; error?: string }> {
    const config = (stage.automationConfig ?? {}) as Record<string, unknown>;

    this.logger.log(
      `Executing stage ${stage.id} (${stage.automationType}): ${stage.name}`,
    );

    try {
      switch (stage.automationType) {
        case 'EMAIL':
          await this.executeEmail(config, context);
          break;

        case 'TASK':
          await this.executeTask(config, context);
          break;

        case 'QUOTE':
          await this.executeQuote(config, context);
          break;

        case 'CONTRACT':
          await this.executeContract(config, context);
          break;

        case 'QUESTIONNAIRE':
          await this.executeQuestionnaire(config, context);
          break;

        case 'REMINDER':
          await this.executeReminder(config, context);
          break;

        case 'NOTIFICATION':
          await this.executeNotification(config, context);
          break;

        default:
          return {
            success: false,
            error: `Unknown automation type: ${stage.automationType}`,
          };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Stage ${stage.id} failed: ${message}`);
      return { success: false, error: message };
    }
  }

  private async executeEmail(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    const recipientId = String(
      config['recipientId'] ?? context.eventPayload['clientId'] ?? '',
    );
    const recipientEmail = String(
      config['recipientEmail'] ?? context.eventPayload['clientEmail'] ?? '',
    );
    const recipientName = String(
      config['recipientName'] ?? context.eventPayload['clientName'] ?? 'Client',
    );
    const templateKey = String(
      config['templateKey'] ?? 'booking-confirmation',
    );

    if (!recipientEmail) {
      throw new Error('No recipient email for EMAIL stage');
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: context.tenantId },
      select: { name: true, slug: true, logoUrl: true, brandColor: true },
    });

    await this.communicationsService.createAndSend({
      tenantId: context.tenantId,
      recipientId,
      recipientEmail,
      recipientName,
      channel: 'EMAIL',
      templateKey,
      templateData: {
        ...context.eventPayload,
        businessName: tenant.name,
        logoUrl: tenant.logoUrl,
        brandColor: tenant.brandColor,
      },
      bookingId: context.bookingId ?? undefined,
    });
  }

  private async executeTask(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    const members = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId: context.tenantId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
      take: 1,
    });

    const assigneeId = String(
      config['assigneeId'] ?? members[0]?.userId ?? '',
    );
    if (!assigneeId) {
      throw new Error('No assignee for TASK stage');
    }

    const title = String(config['title'] ?? 'Workflow task');
    const body = String(
      config['body'] ?? 'A workflow automation task requires your attention.',
    );

    await this.notificationsService.create({
      tenantId: context.tenantId,
      userId: assigneeId,
      title,
      body,
      category: 'SYSTEM',
      priority: 'HIGH',
      metadata: {
        type: 'task',
        bookingId: context.bookingId,
        ...config,
      },
    });
  }

  private async executeQuote(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    if (!context.bookingId) {
      throw new Error('QUOTE stage requires a bookingId');
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: context.tenantId },
      select: { currency: true },
    });

    await this.prisma.quote.create({
      data: {
        tenantId: context.tenantId,
        bookingId: context.bookingId,
        version: 1,
        status: 'DRAFT',
        subtotal: 0,
        taxTotal: 0,
        total: 0,
        currency: tenant.currency,
        notes: String(
          config['notes'] ?? 'Auto-generated by workflow automation',
        ),
      },
    });

    this.logger.log(
      `Quote created for booking ${context.bookingId} via stage automation`,
    );
  }

  private async executeContract(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    if (!context.bookingId) {
      throw new Error('CONTRACT stage requires a bookingId');
    }

    const templateId = String(config['templateId'] ?? '');
    if (!templateId) {
      throw new Error('CONTRACT stage requires templateId in automationConfig');
    }

    const template = await this.prisma.contractTemplate.findFirst({
      where: { id: templateId, tenantId: context.tenantId, isActive: true },
    });

    if (!template) {
      throw new Error(`Contract template ${templateId} not found`);
    }

    await this.prisma.contract.create({
      data: {
        tenantId: context.tenantId,
        bookingId: context.bookingId,
        templateId,
        content: template.content,
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `Contract created for booking ${context.bookingId} via stage automation`,
    );
  }

  private async executeQuestionnaire(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    const recipientId = String(
      config['recipientId'] ?? context.eventPayload['clientId'] ?? '',
    );
    const recipientEmail = String(
      config['recipientEmail'] ?? context.eventPayload['clientEmail'] ?? '',
    );
    const recipientName = String(
      config['recipientName'] ??
        context.eventPayload['clientName'] ??
        'Client',
    );

    if (!recipientEmail) {
      throw new Error('No recipient email for QUESTIONNAIRE stage');
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: context.tenantId },
      select: { name: true, slug: true, logoUrl: true, brandColor: true },
    });

    const questionnaireUrl = String(
      config['questionnaireUrl'] ??
        `https://${tenant.slug}.savspot.co/questionnaire`,
    );

    await this.communicationsService.createAndSend({
      tenantId: context.tenantId,
      recipientId,
      recipientEmail,
      recipientName,
      channel: 'EMAIL',
      templateKey: 'questionnaire-invitation',
      templateData: {
        clientName: recipientName,
        questionnaireUrl,
        businessName: tenant.name,
        logoUrl: tenant.logoUrl,
        brandColor: tenant.brandColor,
      },
      bookingId: context.bookingId ?? undefined,
    });
  }

  private async executeReminder(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    const recipientId = String(
      config['recipientId'] ?? context.eventPayload['clientId'] ?? '',
    );
    if (!recipientId) {
      throw new Error('No recipient for REMINDER stage');
    }

    const title = String(config['title'] ?? 'Booking reminder');
    const body = String(config['body'] ?? 'You have an upcoming booking.');

    await this.notificationsService.create({
      tenantId: context.tenantId,
      userId: recipientId,
      title,
      body,
      category: 'BOOKING',
      metadata: {
        bookingId: context.bookingId,
        type: 'reminder',
      },
    });
  }

  private async executeNotification(
    config: Record<string, unknown>,
    context: StageExecutionContext,
  ): Promise<void> {
    const recipientId = String(
      config['recipientId'] ?? context.eventPayload['clientId'] ?? '',
    );
    if (!recipientId) {
      throw new Error('No recipient for NOTIFICATION stage');
    }

    const title = String(config['title'] ?? 'Notification');
    const body = String(config['body'] ?? 'You have a new notification.');

    await this.notificationsService.create({
      tenantId: context.tenantId,
      userId: recipientId,
      title,
      body,
      category: 'SYSTEM',
      metadata: {
        bookingId: context.bookingId,
        type: 'workflow_notification',
      },
    });
  }
}
