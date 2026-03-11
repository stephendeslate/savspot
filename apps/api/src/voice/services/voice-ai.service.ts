import { Injectable, Logger } from '@nestjs/common';

interface ConversationMessage {
  role: string;
  text: string;
}

interface AiResponse {
  responseText: string;
  intent: string;
  toolCalls?: Array<{ tool: string; args: Record<string, unknown> }>;
}

@Injectable()
export class VoiceAiService {
  private readonly logger = new Logger(VoiceAiService.name);

  async processUtterance(
    tenantId: string,
    callId: string,
    utterance: string,
    conversationHistory: ConversationMessage[],
  ): Promise<AiResponse> {
    this.logger.log(
      `Processing utterance for tenant=${tenantId} call=${callId}: "${utterance}" (history: ${conversationHistory.length} messages)`,
    );

    const lowerUtterance = utterance.toLowerCase();

    if (
      lowerUtterance.includes('appointment') ||
      lowerUtterance.includes('book') ||
      lowerUtterance.includes('schedule')
    ) {
      return {
        responseText:
          "I'd be happy to help you book an appointment. Could you tell me what service you're looking for and your preferred date and time?",
        intent: 'BOOK_APPOINTMENT',
        toolCalls: [
          {
            tool: 'check_availability',
            args: { tenantId, query: utterance },
          },
        ],
      };
    }

    if (
      lowerUtterance.includes('cancel') ||
      lowerUtterance.includes('reschedule')
    ) {
      return {
        responseText:
          "I can help you with that. Could you please provide your name or the phone number associated with your booking so I can look it up?",
        intent: 'CANCEL_BOOKING',
      };
    }

    if (
      lowerUtterance.includes('hours') ||
      lowerUtterance.includes('open') ||
      lowerUtterance.includes('close') ||
      lowerUtterance.includes('when')
    ) {
      return {
        responseText:
          'Let me check our business hours for you. We are typically open Monday through Friday, 9 AM to 5 PM. Would you like to know about a specific day?',
        intent: 'AVAILABILITY_CHECK',
        toolCalls: [
          {
            tool: 'get_business_info',
            args: { tenantId, infoType: 'hours' },
          },
        ],
      };
    }

    if (
      lowerUtterance.includes('transfer') ||
      lowerUtterance.includes('speak to someone') ||
      lowerUtterance.includes('human') ||
      lowerUtterance.includes('person') ||
      lowerUtterance.includes('representative')
    ) {
      return {
        responseText:
          'Of course, let me transfer you to a team member right away.',
        intent: 'TRANSFER_REQUEST',
        toolCalls: [
          {
            tool: 'transfer_to_human',
            args: { tenantId },
          },
        ],
      };
    }

    return {
      responseText:
        "Thank you for calling. I can help you with booking appointments, checking availability, or cancelling existing bookings. How can I assist you today?",
      intent: 'UNKNOWN',
    };
  }

  buildSystemPrompt(tenantId: string): string {
    return [
      `You are an AI voice receptionist for tenant ${tenantId}.`,
      'You help callers with:',
      '- Booking appointments (check_availability, create_booking)',
      '- Cancelling bookings (cancel_booking)',
      '- Answering questions about business hours and services (get_business_info)',
      '- Transferring to a human when requested (transfer_to_human)',
      '',
      'Be friendly, professional, and concise. Keep responses under 3 sentences for voice.',
      'If you cannot help with something, offer to transfer to a team member.',
    ].join('\n');
  }
}
