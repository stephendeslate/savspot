import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_VOICE_CALLS,
  JOB_PROCESS_TRANSCRIPT,
  JOB_POST_CALL_ACTIONS,
} from '../../bullmq/queue.constants';
import {
  VoiceCallEventsService,
  ProcessTranscriptPayload,
  PostCallActionsPayload,
} from '../services/voice-call-events.service';

@Processor(QUEUE_VOICE_CALLS)
export class VoiceCallDispatcher extends WorkerHost {
  private readonly logger = new Logger(VoiceCallDispatcher.name);

  constructor(private readonly events: VoiceCallEventsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_PROCESS_TRANSCRIPT:
        return this.events.processTranscript(
          (job as Job<ProcessTranscriptPayload>).data,
        );
      case JOB_POST_CALL_ACTIONS:
        return this.events.processPostCallActions(
          (job as Job<PostCallActionsPayload>).data,
        );
      default:
        this.logger.warn(`Unknown voice-calls job: ${job.name}`);
    }
  }
}
