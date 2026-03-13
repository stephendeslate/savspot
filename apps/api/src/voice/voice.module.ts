import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_VOICE_CALLS } from '../bullmq/queue.constants';
import { CommunicationsModule } from '../communications/communications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './services/voice.service';
import { VoiceAiService } from './services/voice-ai.service';
import { VoiceTelephonyService } from './services/voice-telephony.service';
import { VoiceCallDispatcher } from './processors/voice-call.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_VOICE_CALLS }),
    CommunicationsModule,
    NotificationsModule,
  ],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    VoiceAiService,
    VoiceTelephonyService,
    VoiceCallDispatcher,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
