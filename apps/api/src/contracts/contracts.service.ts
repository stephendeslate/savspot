import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { AmendContractDto } from './dto/amend-contract.dto';
import { ListContractsDto } from './dto/list-contracts.dto';
import { createHash } from 'crypto';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Contract Template CRUD
  // ---------------------------------------------------------------------------

  async listTemplates(tenantId: string) {
    return this.prisma.contractTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTemplate(tenantId: string, dto: CreateContractTemplateDto) {
    const template = await this.prisma.contractTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        content: dto.content,
        signatureRequirements: dto.signatureRequirements
          ? (dto.signatureRequirements as Prisma.InputJsonValue)
          : Prisma.DbNull,
        category: dto.category ?? null,
      },
    });

    this.logger.log(`Contract template ${template.id} created for tenant ${tenantId}`);

    return template;
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    dto: UpdateContractTemplateDto,
  ) {
    const existing = await this.prisma.contractTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
    });

    if (!existing) {
      throw new NotFoundException('Contract template not found');
    }

    const updated = await this.prisma.contractTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.signatureRequirements !== undefined && {
          signatureRequirements: dto.signatureRequirements as Prisma.InputJsonValue,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
    });

    this.logger.log(`Contract template ${templateId} updated`);

    return updated;
  }

  async deleteTemplate(tenantId: string, templateId: string) {
    const existing = await this.prisma.contractTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
    });

    if (!existing) {
      throw new NotFoundException('Contract template not found');
    }

    await this.prisma.contractTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    this.logger.log(`Contract template ${templateId} soft-deleted`);

    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Contract Operations
  // ---------------------------------------------------------------------------

  async createContract(tenantId: string, dto: CreateContractDto) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id: dto.templateId, tenantId, isActive: true },
    });

    if (!template) {
      throw new NotFoundException('Contract template not found');
    }

    const contract = await this.prisma.contract.create({
      data: {
        tenantId,
        bookingId: dto.bookingId,
        templateId: dto.templateId,
        quoteId: dto.quoteId ?? null,
        content: dto.content ?? template.content,
        status: 'DRAFT',
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Contract ${contract.id} created from template ${dto.templateId}`);

    return contract;
  }

  async getContract(tenantId: string, contractId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
      include: {
        template: {
          select: { id: true, name: true, signatureRequirements: true },
        },
        signatures: {
          orderBy: { order: 'asc' },
        },
        amendments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async listContracts(tenantId: string, filters: ListContractsDto) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ContractWhereInput = { tenantId };

    if (status) {
      where.status = status as Prisma.ContractWhereInput['status'];
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          template: {
            select: { id: true, name: true },
          },
          signatures: {
            select: { id: true, role: true, signedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendContract(tenantId: string, contractId: string) {
    const contract = await this.getContract(tenantId, contractId);

    if (contract.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot send a contract with status ${contract.status}`,
      );
    }

    const hash = createHash('sha256').update(contract.content).digest('hex');

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'SENT',
      },
    });

    this.logger.log(
      `Contract ${contractId} sent with document hash ${hash}`,
    );

    return { ...updated, documentHash: hash };
  }

  async signContract(
    tenantId: string,
    contractId: string,
    signerId: string,
    dto: SignContractDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      // Row lock the contract for concurrent safety
      const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status FROM contracts WHERE id = ${contractId} FOR UPDATE`;

      if (!Array.isArray(locked) || locked.length === 0) {
        throw new NotFoundException('Contract not found');
      }

      const contractStatus = locked[0]!.status;

      if (contractStatus !== 'SENT' && contractStatus !== 'PARTIALLY_SIGNED') {
        throw new BadRequestException(
          `Cannot sign a contract with status ${contractStatus}`,
        );
      }

      // Create the signature record
      const signature = await tx.contractSignature.create({
        data: {
          contractId,
          signerId,
          role: dto.role,
          signatureData: dto.signatureData,
          signatureType: dto.signatureType,
          signedAt: new Date(),
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
          deviceFingerprint: dto.deviceFingerprint
            ? (dto.deviceFingerprint as Prisma.InputJsonValue)
            : Prisma.DbNull,
          legalDisclosureAccepted: dto.legalDisclosureAccepted,
          electronicConsentAt: new Date(),
          signatureConfidence: dto.signatureConfidence ?? null,
          order: dto.order ?? 0,
        },
      });

      // Check if all required signatures are met
      const contract = await tx.contract.findUniqueOrThrow({
        where: { id: contractId },
        select: { templateId: true },
      });

      const template = await tx.contractTemplate.findFirst({
        where: { id: contract.templateId },
        select: { signatureRequirements: true },
      });

      const requirements = template?.signatureRequirements as Record<string, number> | null;

      let allMet = true;

      if (requirements && typeof requirements === 'object') {
        const existingSignatures = await tx.contractSignature.findMany({
          where: { contractId },
          select: { role: true },
        });

        const countByRole: Record<string, number> = {};
        for (const sig of existingSignatures) {
          countByRole[sig.role] = (countByRole[sig.role] ?? 0) + 1;
        }

        for (const [role, minCount] of Object.entries(requirements)) {
          if ((countByRole[role] ?? 0) < minCount) {
            allMet = false;
            break;
          }
        }
      }

      const newStatus = allMet ? 'SIGNED' : 'PARTIALLY_SIGNED';

      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: newStatus,
          ...(allMet && { signedAt: new Date() }),
        },
      });

      this.logger.log(
        `Contract ${contractId} signed by ${signerId} as ${dto.role}. Status: ${newStatus}`,
      );

      return { contract: updatedContract, signature };
    });
  }

  async voidContract(
    tenantId: string,
    contractId: string,
    userId: string,
    reason: string,
  ) {
    const contract = await this.getContract(tenantId, contractId);

    if (contract.status === 'VOID') {
      throw new BadRequestException('Contract is already voided');
    }

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason,
      },
    });

    this.logger.log(`Contract ${contractId} voided by ${userId}: ${reason}`);

    return updated;
  }

  async amendContract(
    tenantId: string,
    contractId: string,
    userId: string,
    dto: AmendContractDto,
  ) {
    const contract = await this.getContract(tenantId, contractId);

    if (contract.status !== 'SIGNED') {
      throw new BadRequestException(
        `Cannot amend a contract with status ${contract.status}`,
      );
    }

    const [amendment] = await this.prisma.$transaction([
      this.prisma.contractAmendment.create({
        data: {
          contractId,
          requestedBy: userId,
          status: 'REQUESTED',
          reason: dto.reason ?? null,
          sectionsChanged: dto.sectionsChanged
            ? (dto.sectionsChanged as Prisma.InputJsonValue)
            : Prisma.DbNull,
          valueChange: dto.valueChange ?? null,
        },
      }),
      this.prisma.contract.update({
        where: { id: contractId },
        data: { status: 'AMENDED' },
      }),
    ]);

    this.logger.log(`Contract ${contractId} amended by ${userId}`);

    return amendment;
  }
}
