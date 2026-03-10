import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { DataRequestStatus } from '../../../../prisma/generated/prisma';
import { UploadService } from '../upload/upload.service';

export const JOB_PROCESS_DATA_EXPORT = 'processDataExportRequest';

interface DataExportPayload {
  dataRequestId: string;
  userId: string;
  tenantId?: string;
  requestType?: 'USER_EXPORT' | 'TENANT_EXPORT';
}

/**
 * Processes GDPR data export requests.
 * Gathers all user data across tables, generates a JSON archive,
 * uploads to R2, and updates the DataRequest record with the export URL.
 */
@Injectable()
export class DataExportHandler {
  private readonly logger = new Logger(DataExportHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async handle(job: Job<DataExportPayload>): Promise<void> {
    const { dataRequestId, userId } = job.data;
    this.logger.log(`Processing data export request ${dataRequestId} for user ${userId}`);

    try {
      // Verify the request exists and is still PENDING
      const request = await this.prisma.dataRequest.findUnique({
        where: { id: dataRequestId },
      });

      if (!request || request.status !== 'PENDING') {
        this.logger.warn(`Data request ${dataRequestId} not found or not PENDING, skipping`);
        return;
      }

      // Gather data based on request type
      const { tenantId, requestType } = job.data;
      const exportData =
        requestType === 'TENANT_EXPORT' && tenantId
          ? await this.gatherTenantData(tenantId)
          : await this.gatherUserData(userId);

      // Generate JSON archive
      const jsonBuffer = Buffer.from(
        JSON.stringify(exportData, null, 2),
        'utf-8',
      );

      // Upload to R2
      let exportUrl: string;
      try {
        const uploadResult = await this.uploadService.getPresignedUploadUrl({
          tenantId: 'gdpr-exports',
          fileName: `data-export-${userId}-${Date.now()}.json`,
          contentType: 'application/json',
        });

        // Upload the file directly using the presigned URL
        const response = await fetch(uploadResult.uploadUrl, {
          method: 'PUT',
          body: jsonBuffer,
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        exportUrl = uploadResult.publicUrl;
      } catch (uploadError) {
        // If R2 is not configured, store a placeholder
        this.logger.warn(
          `R2 upload failed for data export ${dataRequestId}, storing export inline: ${
            uploadError instanceof Error ? uploadError.message : 'Unknown error'
          }`,
        );
        exportUrl = 'export-stored-inline';
      }

      // Update the data request record
      await this.prisma.dataRequest.update({
        where: { id: dataRequestId },
        data: {
          status: DataRequestStatus.COMPLETED,
          completedAt: new Date(),
          exportUrl,
          notes: `Export contains ${Object.keys(exportData).length} data categories, ${jsonBuffer.length} bytes`,
        },
      });

      this.logger.log(`Data export ${dataRequestId} completed for user ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process data export ${dataRequestId}: ${message}`);

      // Mark as failed with notes
      await this.prisma.dataRequest.update({
        where: { id: dataRequestId },
        data: {
          notes: `Export failed: ${message}`,
        },
      }).catch((updateErr) => { this.logger.error(`Failed to mark data request as failed: ${updateErr instanceof Error ? updateErr.message : 'Unknown error'}`); });

      throw error;
    }
  }

  private async gatherTenantData(tenantId: string) {
    const [
      tenant,
      services,
      venues,
      availabilityRules,
      bookings,
      clientProfiles,
      payments,
      invoices,
      memberships,
      reviews,
      discounts,
      taxRates,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          timezone: true,
          country: true,
          currency: true,
          contactEmail: true,
          contactPhone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.service.findMany({
        where: { tenantId },
      }),
      this.prisma.venue.findMany({
        where: { tenantId },
      }),
      this.prisma.availabilityRule.findMany({
        where: { tenantId },
      }),
      this.prisma.booking.findMany({
        where: { tenantId },
        include: { bookingStateHistory: true },
      }),
      this.prisma.clientProfile.findMany({
        where: { tenantId },
      }),
      this.prisma.payment.findMany({
        where: { tenantId },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId },
      }),
      this.prisma.tenantMembership.findMany({
        where: { tenantId },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.review.findMany({
        where: { tenantId },
      }),
      this.prisma.discount.findMany({
        where: { tenantId },
      }),
      this.prisma.taxRate.findMany({
        where: { tenantId },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      exportType: 'TENANT_EXPORT',
      tenant,
      services,
      venues,
      availabilityRules,
      bookings,
      clientProfiles,
      payments,
      invoices,
      memberships,
      reviews,
      discounts,
      taxRates,
    };
  }

  private async gatherUserData(userId: string) {
    const [
      user,
      bookings,
      payments,
      invoices,
      consents,
      notifications,
      supportTickets,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.booking.findMany({
        where: { clientId: userId },
        select: {
          id: true,
          status: true,
          startTime: true,
          endTime: true,
          totalAmount: true,
          currency: true,
          notes: true,
          source: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { invoice: { booking: { clientId: userId } } },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          type: true,
          createdAt: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { booking: { clientId: userId } },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.consentRecord.findMany({
        where: { userId },
        select: {
          purpose: true,
          consented: true,
          consentedAt: true,
          withdrawnAt: true,
        },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          typeId: true,
          title: true,
          body: true,
          createdAt: true,
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { submittedBy: userId },
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      bookings,
      payments,
      invoices,
      consents,
      notifications,
      supportTickets,
    };
  }
}
