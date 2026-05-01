import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { JobDispatcher } from '../bullmq/job-dispatcher.service';
import { QUEUE_IMPORTS, JOB_PROCESS_IMPORT } from '../bullmq/queue.constants';
import { CreateImportDto } from './dto/create-import.dto';
import { ListImportsDto } from './dto/list-imports.dto';
import { clampPageSize } from '../common/utils/pagination';
import { parseCsv } from './parsers/csv-import-parser';
import { parseJson } from './parsers/json-import-parser';
import {
  handleClientRow,
  ImportRowResult,
} from './handlers/client-import.handler';
import { handleServiceRow } from './handlers/service-import.handler';
import { handleAppointmentRow } from './handlers/appointment-import.handler';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: JobDispatcher,
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

    await this.dispatcher.dispatch(QUEUE_IMPORTS, JOB_PROCESS_IMPORT, {
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

    let job: Awaited<ReturnType<typeof this.prisma.importJob.findFirst>>;

    try {
      job = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        const found = await tx.importJob.findFirst({
          where: { id: importJobId, tenantId },
        });

        if (!found) {
          throw new Error(`Import job ${importJobId} not found`);
        }

        await tx.importJob.update({
          where: { id: importJobId },
          data: { status: 'PROCESSING' },
        });

        return found;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Import job ${importJobId} failed to start: ${message}`,
      );
      throw err;
    }

    try {
      if (!job) {
        throw new Error('Import job not found after transaction');
      }

      if (!job.fileUrl) {
        throw new Error('Import job has no file URL');
      }

      const response = await fetch(job.fileUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch import file: HTTP ${response.status}`,
        );
      }

      const fileData = await response.text();
      const columnMapping = job.columnMapping as Record<
        string,
        string
      > | null;

      let rows: Record<string, string>[];

      if (job.sourcePlatform === 'JSON_GENERIC') {
        rows = parseJson(fileData, columnMapping);
      } else {
        rows = await parseCsv(fileData, columnMapping);
      }

      type RowHandler = (
        prisma: PrismaService,
        tenantId: string,
        row: Record<string, string>,
      ) => Promise<ImportRowResult>;

      let handler: RowHandler;
      switch (job.importType) {
        case 'CLIENTS':
          handler = handleClientRow;
          break;
        case 'SERVICES':
          handler = handleServiceRow;
          break;
        case 'APPOINTMENTS':
          handler = handleAppointmentRow;
          break;
        default:
          throw new Error(`Unsupported import type: ${job.importType}`);
      }

      const BATCH_SIZE = 50;
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

          for (let j = 0; j < batch.length; j++) {
            const rowNumber = i + j + 1;
            const row = batch[j]!;

            try {
              const result = await handler(this.prisma, tenantId, row);

              await tx.importRecord.create({
                data: {
                  importJobId,
                  rowNumber,
                  rawData: row as unknown as Prisma.InputJsonValue,
                  status: result.status,
                  targetTable: result.targetTable,
                  targetId: result.targetId ?? null,
                  errorMessage: result.errorMessage ?? null,
                },
              });

              if (result.status === 'IMPORTED') imported++;
              else if (result.status === 'SKIPPED_DUPLICATE') skipped++;
              else errors++;
            } catch (rowErr) {
              const rowMessage =
                rowErr instanceof Error ? rowErr.message : 'Unknown error';
              await tx.importRecord.create({
                data: {
                  importJobId,
                  rowNumber,
                  rawData: row as unknown as Prisma.InputJsonValue,
                  status: 'ERROR',
                  targetTable: 'Unknown',
                  errorMessage: rowMessage,
                },
              });
              errors++;
            }
          }
        });
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        await tx.importJob.update({
          where: { id: importJobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            stats: {
              totalRows: rows.length,
              imported,
              skipped,
              errors,
            },
          },
        });
      });

      this.logger.log(
        `Import job ${importJobId} completed: ${imported} imported, ${skipped} skipped, ${errors} errors out of ${rows.length} rows`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Import job ${importJobId} failed: ${message}`);

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
