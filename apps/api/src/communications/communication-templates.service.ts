import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CommunicationChannel } from '../../../../prisma/generated/prisma';
import { sanitizeTemplate } from './template-sandbox';
import { TEMPLATE_VARIABLE_REGISTRY } from './template-variables';

@Injectable()
export class CommunicationTemplatesService {
  private readonly logger = new Logger(CommunicationTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(
    tenantId: string,
    filters?: { channel?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CommunicationTemplateWhereInput = {
      tenantId,
      isActive: true,
    };

    if (filters?.channel) {
      where.channel = filters.channel as CommunicationChannel;
    }

    const [data, total] = await Promise.all([
      this.prisma.communicationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communicationTemplate.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTemplate(tenantId: string, templateId: string) {
    const template = await this.prisma.communicationTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
      include: { layout: true },
    });

    if (!template) {
      throw new NotFoundException('Communication template not found');
    }

    return template;
  }

  async createTemplate(
    tenantId: string,
    dto: {
      name: string;
      subject?: string;
      body: string;
      channel: string;
      eventType?: string;
      layoutId?: string;
    },
  ) {
    const validation = sanitizeTemplate(dto.body);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    const key = this.generateKey(dto.name, dto.eventType);

    const template = await this.prisma.communicationTemplate.create({
      data: {
        tenantId,
        key,
        name: dto.name,
        channel: dto.channel as CommunicationChannel,
        subjectTemplate: dto.subject ?? null,
        bodyTemplate: dto.body,
        layoutId: dto.layoutId ?? null,
        sandboxValidated: true,
      },
    });

    this.logger.log(
      `Template created: id=${template.id} key=${key} tenant=${tenantId}`,
    );

    return template;
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    dto: {
      name?: string;
      subject?: string;
      body?: string;
      channel?: string;
      eventType?: string;
      layoutId?: string;
      changeReason?: string;
    },
    changedBy: string,
  ) {
    const existing = await this.prisma.communicationTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
    });

    if (!existing) {
      throw new NotFoundException('Communication template not found');
    }

    if (dto.body) {
      const validation = sanitizeTemplate(dto.body);
      if (!validation.valid) {
        throw new BadRequestException(validation.errors);
      }
    }

    const lastHistory = await this.prisma.templateHistory.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastHistory?.version ?? 0) + 1;

    const [template] = await this.prisma.$transaction([
      this.prisma.communicationTemplate.update({
        where: { id: templateId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.subject !== undefined && { subjectTemplate: dto.subject }),
          ...(dto.body !== undefined && {
            bodyTemplate: dto.body,
            sandboxValidated: true,
          }),
          ...(dto.channel !== undefined && {
            channel: dto.channel as CommunicationChannel,
          }),
          ...(dto.layoutId !== undefined && { layoutId: dto.layoutId }),
        },
      }),
      this.prisma.templateHistory.create({
        data: {
          templateId,
          version: nextVersion,
          subjectTemplate: existing.subjectTemplate,
          bodyTemplate: existing.bodyTemplate,
          changedBy,
          changeReason: dto.changeReason ?? null,
        },
      }),
    ]);

    this.logger.log(
      `Template updated: id=${templateId} version=${nextVersion} tenant=${tenantId}`,
    );

    return template;
  }

  async deleteTemplate(tenantId: string, templateId: string) {
    const existing = await this.prisma.communicationTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
    });

    if (!existing) {
      throw new NotFoundException('Communication template not found');
    }

    await this.prisma.communicationTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    return { deleted: true };
  }

  async getTemplateHistory(tenantId: string, templateId: string) {
    const template = await this.prisma.communicationTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Communication template not found');
    }

    return this.prisma.templateHistory.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
  }

  async rollbackTemplate(
    tenantId: string,
    templateId: string,
    historyId: string,
    changedBy: string,
  ) {
    const template = await this.prisma.communicationTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
    });

    if (!template) {
      throw new NotFoundException('Communication template not found');
    }

    const historyEntry = await this.prisma.templateHistory.findFirst({
      where: { id: historyId, templateId },
    });

    if (!historyEntry) {
      throw new NotFoundException('Template history entry not found');
    }

    const lastHistory = await this.prisma.templateHistory.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastHistory?.version ?? 0) + 1;

    const [updated] = await this.prisma.$transaction([
      this.prisma.communicationTemplate.update({
        where: { id: templateId },
        data: {
          subjectTemplate: historyEntry.subjectTemplate,
          bodyTemplate: historyEntry.bodyTemplate,
        },
      }),
      this.prisma.templateHistory.create({
        data: {
          templateId,
          version: nextVersion,
          subjectTemplate: template.subjectTemplate,
          bodyTemplate: template.bodyTemplate,
          changedBy,
          changeReason: `Rollback to version ${historyEntry.version}`,
        },
      }),
    ]);

    this.logger.log(
      `Template rolled back: id=${templateId} to version=${historyEntry.version} tenant=${tenantId}`,
    );

    return updated;
  }

  getAvailableVariables() {
    return TEMPLATE_VARIABLE_REGISTRY;
  }

  private generateKey(name: string, eventType?: string): string {
    if (eventType) {
      return eventType.toLowerCase().replace(/\s+/g, '-');
    }
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
