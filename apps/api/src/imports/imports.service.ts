import {
  Injectable,
  NotFoundException,
  NotImplementedException,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_IMPORTS, JOB_PROCESS_IMPORT } from '../bullmq/queue.constants';
import { CreateImportDto } from './dto/create-import.dto';
import { ListImportsDto } from './dto/list-imports.dto';
import { clampPageSize } from '../common/utils/pagination';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_IMPORTS) private readonly importQueue: Queue,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateImportDto,
    fileUrl: string | null,
  ) {
    const importJob = await this.prisma.importJob.create({
      data: {
        tenantId,
        sourcePlatform: dto.sourcePlatform,
        importType: dto.importType,
        status: 'PENDING',
        fileUrl: fileUrl ?? null,
        columnMapping: dto.columnMapping ?? Prisma.DbNull,
        initiatedBy: userId,
      },
    });

    await this.importQueue.add(JOB_PROCESS_IMPORT, {
      importJobId: importJob.id,
      tenantId,
    });

    this.logger.log(
      `Import job ${importJob.id} created for tenant ${tenantId} by user ${userId}`,
    );

    return importJob;
  }

  async findAll(tenantId: string, filters: ListImportsDto) {
    const { status, page = 1, limit: rawLimit = 20 } = filters;
    const limit = clampPageSize(rawLimit);
    const skip = (page - 1) * limit;

    const where: Prisma.ImportJobWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.importJob.count({ where }),
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

  async findOne(tenantId: string, id: string) {
    const importJob = await this.prisma.importJob.findFirst({
      where: { id, tenantId },
      include: {
        records: {
          where: { status: 'ERROR' },
          take: 50,
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    if (!importJob) {
      throw new NotFoundException('Import job not found');
    }

    return importJob;
  }

  async getErrorReport(tenantId: string, id: string) {
    const importJob = await this.prisma.importJob.findFirst({
      where: { id, tenantId },
      select: { id: true, errorLog: true },
    });

    if (!importJob) {
      throw new NotFoundException('Import job not found');
    }

    const errorRecords = await this.prisma.importRecord.findMany({
      where: { importJobId: id, status: 'ERROR' },
      orderBy: { rowNumber: 'asc' },
      select: {
        rowNumber: true,
        errorMessage: true,
        rawData: true,
      },
    });

    return {
      importJobId: id,
      errorLog: importJob.errorLog,
      errors: errorRecords,
      totalErrors: errorRecords.length,
    };
  }

  async processImport(importJobId: string, tenantId: string): Promise<void> {
    this.logger.log(
      `Processing import job ${importJobId} for tenant ${tenantId}`,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        const job = await tx.importJob.findFirst({
          where: { id: importJobId, tenantId },
        });

        if (!job) {
          throw new Error(`Import job ${importJobId} not found`);
        }

        await tx.importJob.update({
          where: { id: importJobId },
          data: { status: 'PROCESSING' },
        });

        return job;
      });

      // Bulk import processing is not yet implemented
      // Set job to FAILED so the caller knows
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        await tx.importJob.update({
          where: { id: importJobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorLog: { error: 'Bulk import processing is not yet implemented' },
          },
        });
      });

      throw new NotImplementedException(
        'Bulk import processing is not yet implemented',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Import job ${importJobId} failed: ${message}`,
      );

      await this.prisma.importJob
        .update({
          where: { id: importJobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorLog: { error: message },
          },
        })
        .catch(() => {
          /* best effort */
        });

      throw err;
    }
  }
}
