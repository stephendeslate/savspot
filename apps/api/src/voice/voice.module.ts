import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './services/voice.service';
import { VoiceAiService } from './services/voice-ai.service';
import { VoiceTelephonyService } from './services/voice-telephony.service';
import { VoiceCallEventsService } from './services/voice-call-events.service';

@Module({
  imports: [CommunicationsModule, NotificationsModule],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    VoiceAiService,
    VoiceTelephonyService,
    VoiceCallEventsService,
  ],
  exports: [VoiceService, VoiceCallEventsService],
})
export class VoiceModule {}
