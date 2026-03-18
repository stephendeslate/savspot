import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { VoiceService } from './services/voice.service';
import { VoiceTelephonyService } from './services/voice-telephony.service';
import { RequiresLicense } from '@savspot/ee';
import {
  TwilioAnswerDto,
  TwilioGatherDto,
  TwilioStatusDto,
  UpdateVoiceConfigDto,
  ListCallLogsDto,
} from './dto/voice-webhook.dto';

@ApiTags('Voice')

@RequiresLicense()
@Controller()
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private readonly voiceService: VoiceService,
    private readonly telephonyService: VoiceTelephonyService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Post('api/voice/answer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Twilio incoming call webhook' })
  @ApiResponse({ status: 200, description: 'TwiML response' })
  async handleAnswer(
    @Body() body: TwilioAnswerDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Incoming call: callSid=${body.CallSid} from=${body.From} to=${body.To}`,
    );

    try {
      const result = await this.voiceService.handleIncomingCall(
        body.To,
        body.From,
      );

      await this.voiceService.initConversationState(
        body.CallSid,
        result.tenantId,
        body.From,
      );

      let twiml: string;

      if (result.mode === 'transfer' && result.transferNumber) {
        twiml = this.telephonyService.generateTransferTwiml(
          result.transferNumber,
          result.transferTimeoutSeconds,
        );
      } else {
        twiml = this.telephonyService.generateGatherTwiml(result.greeting);
      }

      res.set('Content-Type', 'application/xml');
      res.send(twiml);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling incoming call: ${message}`);

      const twiml = this.telephonyService.generateSayTwiml(
        'We are sorry, we are unable to take your call at this time. Please try again later.',
      );
      res.set('Content-Type', 'application/xml');
      res.send(twiml);
    }
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Post('api/voice/gather')
  @HttpCode(200)
  @ApiOperation({ summary: 'Twilio gather (speech input) webhook' })
  @ApiResponse({ status: 200, description: 'TwiML response' })
  async handleGather(
    @Body() body: TwilioGatherDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Gather input: callSid=${body.CallSid} speech="${body.SpeechResult}" confidence=${body.Confidence ?? 'N/A'}`,
    );

    try {
      const result = await this.voiceService.processGatherInput(
        body.CallSid,
        body.SpeechResult,
        body.Confidence,
      );

      let twiml: string;

      if (result.shouldTransfer && result.transferNumber) {
        twiml = this.telephonyService.generateTransferTwiml(
          result.transferNumber,
          result.transferTimeoutSeconds,
        );
      } else {
        twiml = this.telephonyService.generateGatherTwiml(
          result.responseText,
        );
      }

      res.set('Content-Type', 'application/xml');
      res.send(twiml);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing gather input: ${message}`);

      const twiml = this.telephonyService.generateSayTwiml(
        'I apologize, I encountered an error. Please try again.',
      );
      res.set('Content-Type', 'application/xml');
      res.send(twiml);
    }
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Post('api/voice/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Twilio call status callback' })
  @ApiResponse({ status: 200, description: 'Status acknowledged' })
  async handleStatus(
    @Body() body: TwilioStatusDto,
  ): Promise<{ received: boolean }> {
    this.logger.log(
      `Call status: callSid=${body.CallSid} status=${body.CallStatus} duration=${body.CallDuration ?? 'N/A'}`,
    );

    try {
      await this.voiceService.handleCallStatus(
        body.CallSid,
        body.CallStatus,
        body.CallDuration,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling call status: ${message}`);
    }

    return { received: true };
  }

  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @Get('tenants/:tenantId/voice/config')
  @ApiOperation({ summary: 'Get voice configuration' })
  @ApiResponse({ status: 200, description: 'Voice configuration' })
  async getConfig(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.voiceService.getVoiceConfig(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @Patch('tenants/:tenantId/voice/config')
  @ApiOperation({ summary: 'Update voice configuration' })
  @ApiResponse({ status: 200, description: 'Updated voice configuration' })
  async updateConfig(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() body: UpdateVoiceConfigDto,
  ) {
    return this.voiceService.updateVoiceConfig(
      tenantId,
      body as unknown as Record<string, unknown>,
    );
  }

  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @Get('tenants/:tenantId/voice/call-logs')
  @ApiOperation({ summary: 'List call logs' })
  @ApiResponse({ status: 200, description: 'Paginated call logs' })
  async getCallLogs(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListCallLogsDto,
  ) {
    return this.voiceService.getCallLogs(tenantId, query);
  }

  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @Get('voice/call-logs/:id/transcript')
  @ApiOperation({ summary: 'Get call transcript' })
  @ApiResponse({ status: 200, description: 'Call transcript' })
  @ApiResponse({ status: 404, description: 'Call log not found' })
  async getTranscript(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.voiceService.getCallTranscript(id);
  }
}
