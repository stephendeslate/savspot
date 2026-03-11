import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { VoiceAiService } from './voice-ai.service';
import { ListCallLogsDto } from '../dto/voice-webhook.dto';

interface ConversationMessage {
  role: string;
  text: string;
}

interface ConversationState {
  tenantId: string;
  callerNumber: string;
  history: ConversationMessage[];
  startedAt: string;
}

interface IncomingCallResult {
  tenantId: string;
  tenantName: string;
  voiceConfig: Record<string, unknown> | null;
  voiceEnabled: boolean;
  mode: 'ai' | 'transfer';
  greeting: string;
  transferNumber: string | null;
  transferTimeoutSeconds: number;
}

interface GatherResult {
  responseText: string;
  intent: string;
  shouldTransfer: boolean;
  transferNumber: string | null;
  transferTimeoutSeconds: number;
}

const CONVERSATION_TTL_SECONDS = 1800; // 30 minutes
const REDIS_KEY_PREFIX = 'voice:conversation:';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly voiceAi: VoiceAiService,
  ) {}

  async handleIncomingCall(
    calledNumber: string,
    callerNumber: string,
  ): Promise<IncomingCallResult> {
    if (process.env['FEATURE_VOICE'] !== 'true') {
      throw new BadRequestException('Voice feature is not enabled');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { voicePhoneNumber: calledNumber },
      select: {
        id: true,
        name: true,
        voiceEnabled: true,
        voiceConfig: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        `No tenant found for phone number: ${calledNumber}`,
      );
    }

    if (!tenant.voiceEnabled) {
      throw new BadRequestException('Voice receptionist is not enabled for this tenant');
    }

    const config = (tenant.voiceConfig as Record<string, unknown>) ?? {};
    const mode = config['mode'] as string | undefined;
    const greeting =
      (config['greeting'] as string) ??
      `Thank you for calling ${tenant.name}. How can I help you today?`;
    const afterHoursGreeting = config['afterHoursGreeting'] as
      | string
      | undefined;
    const transferNumber = (config['transferNumber'] as string) ?? null;
    const transferTimeoutSeconds =
      (config['transferTimeoutSeconds'] as number) ?? 30;

    const isWithinBusinessHours = this.checkBusinessHours();
    const effectiveGreeting =
      !isWithinBusinessHours && afterHoursGreeting
        ? afterHoursGreeting
        : greeting;

    let effectiveMode: 'ai' | 'transfer';
    if (mode === 'transfer_only') {
      effectiveMode = 'transfer';
    } else if (mode === 'ai_with_transfer' && !isWithinBusinessHours) {
      effectiveMode = 'ai';
    } else if (mode === 'ai_only') {
      effectiveMode = 'ai';
    } else {
      effectiveMode = 'ai';
    }

    this.logger.log(
      `Incoming call from ${callerNumber} to ${calledNumber} — tenant=${tenant.id} mode=${effectiveMode}`,
    );

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      voiceConfig: config,
      voiceEnabled: tenant.voiceEnabled,
      mode: effectiveMode,
      greeting: effectiveGreeting,
      transferNumber,
      transferTimeoutSeconds,
    };
  }

  async processGatherInput(
    callSid: string,
    speechResult: string,
    confidence: number | undefined,
  ): Promise<GatherResult> {
    const state = await this.getConversationState(callSid);

    if (!state) {
      this.logger.warn(`No conversation state found for callSid=${callSid}`);
      return {
        responseText:
          "I'm sorry, I seem to have lost track of our conversation. How can I help you?",
        intent: 'UNKNOWN',
        shouldTransfer: false,
        transferNumber: null,
        transferTimeoutSeconds: 30,
      };
    }

    state.history.push({ role: 'user', text: speechResult });

    const aiResponse = await this.voiceAi.processUtterance(
      state.tenantId,
      callSid,
      speechResult,
      state.history,
    );

    state.history.push({ role: 'assistant', text: aiResponse.responseText });

    await this.saveConversationState(callSid, state);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: state.tenantId },
      select: { voiceConfig: true },
    });

    const config = (tenant?.voiceConfig as Record<string, unknown>) ?? {};
    const transferNumber = (config['transferNumber'] as string) ?? null;
    const transferTimeoutSeconds =
      (config['transferTimeoutSeconds'] as number) ?? 30;

    const shouldTransfer = aiResponse.intent === 'TRANSFER_REQUEST';

    this.logger.log(
      `Gather processed for callSid=${callSid}: intent=${aiResponse.intent} confidence=${confidence ?? 'N/A'}`,
    );

    return {
      responseText: aiResponse.responseText,
      intent: aiResponse.intent,
      shouldTransfer,
      transferNumber,
      transferTimeoutSeconds,
    };
  }

  async handleCallStatus(
    callSid: string,
    status: string,
    duration: number | undefined,
  ): Promise<void> {
    this.logger.log(
      `Call status update: callSid=${callSid} status=${status} duration=${duration ?? 'N/A'}`,
    );

    const state = await this.getConversationState(callSid);

    if (!state) {
      this.logger.warn(
        `No conversation state for callSid=${callSid} during status update`,
      );
      return;
    }

    const statusMap: Record<string, string> = {
      completed: 'COMPLETED',
      busy: 'BUSY',
      'no-answer': 'NO_ANSWER',
      failed: 'FAILED',
      canceled: 'FAILED',
    };

    const mappedStatus = statusMap[status] ?? 'COMPLETED';

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${state.tenantId}, TRUE)`;

      await tx.voiceCallLog.upsert({
        where: { callSid },
        create: {
          tenantId: state.tenantId,
          callSid,
          callerNumber: state.callerNumber,
          direction: 'INBOUND',
          status: mappedStatus as 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'BUSY' | 'NO_ANSWER' | 'FAILED',
          duration: duration ?? null,
          aiHandled: state.history.length > 0,
          transcript: state.history.length > 0 ? (state.history as unknown as Prisma.InputJsonValue) : undefined,
          createdAt: new Date(state.startedAt),
        },
        update: {
          status: mappedStatus as 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'BUSY' | 'NO_ANSWER' | 'FAILED',
          duration: duration ?? undefined,
          aiHandled: state.history.length > 0,
          transcript: state.history.length > 0 ? (state.history as unknown as Prisma.InputJsonValue) : undefined,
        },
      });
    });

    await this.redis.del(`${REDIS_KEY_PREFIX}${callSid}`);
  }

  async getCallLogs(tenantId: string, query: ListCallLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      const items = await tx.voiceCallLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          callSid: true,
          callerNumber: true,
          callerClientId: true,
          direction: true,
          duration: true,
          status: true,
          aiHandled: true,
          bookingId: true,
          createdAt: true,
        },
      });

      const count = await tx.voiceCallLog.count({
        where: { tenantId },
      });

      return [items, count];
    });

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

  async getCallTranscript(callLogId: string) {
    const callLog = await this.prisma.voiceCallLog.findUnique({
      where: { id: callLogId },
      select: {
        id: true,
        callSid: true,
        callerNumber: true,
        transcript: true,
        toolCalls: true,
        aiConfidenceScores: true,
        createdAt: true,
      },
    });

    if (!callLog) {
      throw new NotFoundException(`Call log not found: ${callLogId}`);
    }

    return callLog;
  }

  async getVoiceConfig(tenantId: string) {
    const tenant = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      return tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          voiceEnabled: true,
          voicePhoneNumber: true,
          voiceConfig: true,
        },
      });
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    return {
      voiceEnabled: tenant.voiceEnabled,
      voicePhoneNumber: tenant.voicePhoneNumber,
      voiceConfig: tenant.voiceConfig,
    };
  }

  async updateVoiceConfig(
    tenantId: string,
    updates: Record<string, unknown>,
  ) {
    const tenant = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      const existing = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { voiceConfig: true, voiceEnabled: true },
      });

      if (!existing) {
        throw new NotFoundException(`Tenant not found: ${tenantId}`);
      }

      const currentConfig =
        (existing.voiceConfig as Record<string, unknown>) ?? {};

      const voiceEnabled =
        updates['voiceEnabled'] !== undefined
          ? (updates['voiceEnabled'] as boolean)
          : existing.voiceEnabled;

      const configUpdates = { ...updates };
      delete configUpdates['voiceEnabled'];

      const newConfig = { ...currentConfig, ...configUpdates };

      return tx.tenant.update({
        where: { id: tenantId },
        data: {
          voiceEnabled,
          voiceConfig: newConfig as unknown as Prisma.InputJsonValue,
        },
        select: {
          voiceEnabled: true,
          voicePhoneNumber: true,
          voiceConfig: true,
        },
      });
    });

    return {
      voiceEnabled: tenant.voiceEnabled,
      voicePhoneNumber: tenant.voicePhoneNumber,
      voiceConfig: tenant.voiceConfig,
    };
  }

  async initConversationState(
    callSid: string,
    tenantId: string,
    callerNumber: string,
  ): Promise<void> {
    const state: ConversationState = {
      tenantId,
      callerNumber,
      history: [],
      startedAt: new Date().toISOString(),
    };

    await this.saveConversationState(callSid, state);
  }

  private async getConversationState(
    callSid: string,
  ): Promise<ConversationState | null> {
    const raw = await this.redis.get(`${REDIS_KEY_PREFIX}${callSid}`);
    if (!raw) return null;
    return JSON.parse(raw) as ConversationState;
  }

  private async saveConversationState(
    callSid: string,
    state: ConversationState,
  ): Promise<void> {
    await this.redis.setex(
      `${REDIS_KEY_PREFIX}${callSid}`,
      CONVERSATION_TTL_SECONDS,
      JSON.stringify(state),
    );
  }

  private checkBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }
}
