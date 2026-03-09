import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketStatus,
  AIResolutionType,
  ResolvedBy,
} from '../../../../prisma/generated/prisma';

interface TriagePayload {
  ticketId: string;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

interface TriageResult {
  classification: 'AUTO_RESOLVE' | 'NEEDS_REVIEW';
  confidence: number;
  diagnosis: string;
  suggestedResponse?: string;
}

/**
 * AI-powered support ticket triage using local Ollama (Qwen3).
 * Triggered when a new support ticket is created.
 * Classifies tickets and auto-resolves common issues with high confidence.
 */
@Injectable()
export class SupportTriageHandler {
  private readonly logger = new Logger(SupportTriageHandler.name);
  private readonly ollamaUrl: string;
  private readonly model: string;
  private readonly confidenceThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.ollamaUrl = this.configService.get<string>(
      'OLLAMA_URL',
      'http://localhost:11434',
    );
    this.model = this.configService.get<string>(
      'OLLAMA_MODEL',
      'qwen3-coder-next',
    );
    this.confidenceThreshold = this.configService.get<number>('AI_CONFIDENCE_THRESHOLD', 0.85);
  }

  async handle(job: Job<TriagePayload>): Promise<void> {
    const { ticketId } = job.data;
    this.logger.log(`Triaging support ticket ${ticketId}`);

    try {
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          submitter: { select: { name: true, email: true } },
          tenant: { select: { name: true, category: true } },
        },
      });

      if (!ticket) {
        this.logger.warn(`Ticket ${ticketId} not found, skipping`);
        return;
      }

      if (ticket.status !== 'NEW') {
        this.logger.log(`Ticket ${ticketId} is not NEW (status: ${ticket.status}), skipping`);
        return;
      }

      const result = await this.classifyTicket(ticket);

      if (result.classification === 'AUTO_RESOLVE' && result.confidence >= this.confidenceThreshold) {
        await this.prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.AI_RESOLVED,
            aiDiagnosis: result.diagnosis,
            aiResponse: result.suggestedResponse ?? null,
            aiResolutionType: AIResolutionType.FAQ_MATCH,
            resolvedBy: ResolvedBy.AI,
            resolvedAt: new Date(),
          },
        });
        this.logger.log(
          `Ticket ${ticketId} auto-resolved (confidence: ${result.confidence})`,
        );
      } else {
        await this.prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.NEEDS_MANUAL_REVIEW,
            aiDiagnosis: result.diagnosis,
          },
        });
        this.logger.log(
          `Ticket ${ticketId} escalated for manual review (confidence: ${result.confidence})`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to triage ticket ${ticketId}: ${message}`);

      // Mark for manual review on AI failure
      await this.prisma.supportTicket
        .update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.NEEDS_MANUAL_REVIEW,
            aiDiagnosis: `AI triage failed: ${message}`,
          },
        })
        .catch((updateErr) => { this.logger.error(`Failed to update ticket ${ticketId} after triage failure: ${updateErr instanceof Error ? updateErr.message : 'Unknown error'}`); });
    }
  }

  private async classifyTicket(ticket: {
    category: string;
    severity: string;
    subject: string;
    body: string;
    submitter: { name: string | null; email: string } | null;
    tenant: { name: string; category: string } | null;
  }): Promise<TriageResult> {
    const prompt = `You are an AI support agent for SavSpot, a booking platform for service businesses.

Analyze this support ticket and classify it:

Category: ${ticket.category}
Severity: ${ticket.severity}
Subject: ${ticket.subject}
Body: ${ticket.body}
Business type: ${ticket.tenant?.category ?? 'Unknown'}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "classification": "AUTO_RESOLVE" or "NEEDS_REVIEW",
  "confidence": 0.0 to 1.0,
  "diagnosis": "Brief diagnosis of the issue",
  "suggestedResponse": "A helpful response to send the user (only if AUTO_RESOLVE)"
}

Rules:
- AUTO_RESOLVE only for common, well-understood issues (password resets, how-to questions, known FAQs)
- NEEDS_REVIEW for billing disputes, data issues, bugs, feature requests, anything ambiguous
- Be conservative: when in doubt, use NEEDS_REVIEW
- Keep suggestedResponse professional, helpful, and concise`;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 500,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaResponse;
      const parsed = this.parseTriageResponse(data.response);
      return parsed;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn('Ollama request timed out');
      }
      // Default to manual review on any AI failure
      return {
        classification: 'NEEDS_REVIEW',
        confidence: 0,
        diagnosis: `AI classification unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private parseTriageResponse(response: string): TriageResult {
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as TriageResult;

      // Validate required fields
      if (!parsed.classification || typeof parsed.confidence !== 'number') {
        throw new Error('Missing required fields');
      }

      // Clamp confidence
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

      // Normalize classification
      if (parsed.classification !== 'AUTO_RESOLVE') {
        parsed.classification = 'NEEDS_REVIEW';
      }

      return parsed;
    } catch {
      return {
        classification: 'NEEDS_REVIEW',
        confidence: 0,
        diagnosis: `Failed to parse AI response: ${response.slice(0, 200)}`,
      };
    }
  }
}
