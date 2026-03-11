import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QUEUE_VOICE_CALLS,
  JOB_PROCESS_TRANSCRIPT,
  JOB_POST_CALL_ACTIONS,
} from '../../bullmq/queue.constants';

interface ProcessTranscriptPayload {
  callLogId: string;
  tenantId: string;
  transcript: Array<{ role: string; text: string }>;
}

interface PostCallActionsPayload {
  callLogId: string;
  tenantId: string;
  bookingId?: string;
}

@Processor(QUEUE_VOICE_CALLS)
export class VoiceCallDispatcher extends WorkerHost {
  private readonly logger = new Logger(VoiceCallDispatcher.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_PROCESS_TRANSCRIPT:
        return this.handleProcessTranscript(
          job as Job<ProcessTranscriptPayload>,
        );
      case JOB_POST_CALL_ACTIONS:
        return this.handlePostCallActions(
          job as Job<PostCallActionsPayload>,
        );
      default:
        this.logger.warn(`Unknown voice-calls job: ${job.name}`);
    }
  }

  private async handleProcessTranscript(
    job: Job<ProcessTranscriptPayload>,
  ): Promise<void> {
    const { callLogId, tenantId, transcript } = job.data;

    this.logger.log(
      `Processing transcript for callLog=${callLogId} tenant=${tenantId}`,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      await tx.voiceCallLog.update({
        where: { id: callLogId },
        data: {
          transcript: transcript,
        },
      });
    });

    this.logger.log(`Transcript stored for callLog=${callLogId}`);
  }

  private async handlePostCallActions(
    job: Job<PostCallActionsPayload>,
  ): Promise<void> {
    const { callLogId, tenantId, bookingId } = job.data;

    this.logger.log(
      `Processing post-call actions for callLog=${callLogId} tenant=${tenantId}`,
    );

    if (bookingId) {
      this.logger.log(
        `Booking ${bookingId} was created during call ${callLogId} — confirmation would be sent here`,
      );
    }

    this.logger.log(`Post-call actions completed for callLog=${callLogId}`);
  }
}
