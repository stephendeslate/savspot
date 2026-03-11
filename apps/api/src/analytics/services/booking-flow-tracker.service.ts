import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

interface StepCompletedPayload {
  tenantId: string;
  sessionId: string;
  flowId: string;
  step: string;
  durationMs: number;
}

interface SessionCompletedPayload {
  tenantId: string;
  sessionId: string;
  flowId: string;
  totalDurationMs: number;
  revenue: number;
}

interface SessionAbandonedPayload {
  tenantId: string;
  sessionId: string;
  flowId: string;
  lastStep: string;
}

@Injectable()
export class BookingFlowTrackerService {
  private readonly logger = new Logger(BookingFlowTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('booking-session.step-completed')
  async handleStepCompleted(payload: StepCompletedPayload): Promise<void> {
    this.logger.log(
      `Step completed: session=${payload.sessionId} step=${payload.step} duration=${payload.durationMs}ms`,
    );

    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const existing = await this.prisma.bookingFlowAnalytics.findUnique({
        where: {
          tenantId_flowId_date: {
            tenantId: payload.tenantId,
            flowId: payload.flowId,
            date: today,
          },
        },
      });

      if (existing) {
        const stepMetrics = (existing.stepMetrics as Array<{
          step: string;
          sessions: number;
          dropOffs: number;
          avgDurationMs: number;
        }>) ?? [];

        const stepIndex = stepMetrics.findIndex(
          (s) => s.step === payload.step,
        );

        if (stepIndex >= 0) {
          const current = stepMetrics[stepIndex]!;
          current.sessions += 1;
          current.avgDurationMs = Math.round(
            (current.avgDurationMs * (current.sessions - 1) +
              payload.durationMs) /
              current.sessions,
          );
        } else {
          stepMetrics.push({
            step: payload.step,
            sessions: 1,
            dropOffs: 0,
            avgDurationMs: payload.durationMs,
          });
        }

        await this.prisma.bookingFlowAnalytics.update({
          where: { id: existing.id },
          data: {
            stepMetrics: stepMetrics as unknown as Prisma.InputJsonValue,
            totalSessions: { increment: 1 },
          },
        });
      } else {
        await this.prisma.bookingFlowAnalytics.create({
          data: {
            tenantId: payload.tenantId,
            flowId: payload.flowId,
            date: today,
            totalSessions: 1,
            completedSessions: 0,
            stepMetrics: [
              {
                step: payload.step,
                sessions: 1,
                dropOffs: 0,
                avgDurationMs: payload.durationMs,
              },
            ],
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to record step completion: ${msg}`);
    }
  }

  @OnEvent('booking-session.completed')
  async handleSessionCompleted(
    payload: SessionCompletedPayload,
  ): Promise<void> {
    this.logger.log(
      `Session completed: session=${payload.sessionId} flow=${payload.flowId}`,
    );

    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const existing = await this.prisma.bookingFlowAnalytics.findUnique({
        where: {
          tenantId_flowId_date: {
            tenantId: payload.tenantId,
            flowId: payload.flowId,
            date: today,
          },
        },
      });

      const durationSec = Math.round(payload.totalDurationMs / 1000);

      if (existing) {
        const prevTotal =
          existing.avgCompletionTimeSec * existing.completedSessions;
        const newCompleted = existing.completedSessions + 1;
        const newAvg = Math.round((prevTotal + durationSec) / newCompleted);

        const newConversionRate =
          existing.totalSessions > 0
            ? newCompleted / existing.totalSessions
            : 0;

        await this.prisma.bookingFlowAnalytics.update({
          where: { id: existing.id },
          data: {
            completedSessions: newCompleted,
            avgCompletionTimeSec: newAvg,
            conversionRate: newConversionRate,
            totalRevenue: { increment: payload.revenue },
          },
        });
      } else {
        await this.prisma.bookingFlowAnalytics.create({
          data: {
            tenantId: payload.tenantId,
            flowId: payload.flowId,
            date: today,
            totalSessions: 1,
            completedSessions: 1,
            conversionRate: 1,
            avgCompletionTimeSec: durationSec,
            totalRevenue: payload.revenue,
            stepMetrics: [],
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to record session completion: ${msg}`);
    }
  }

  @OnEvent('booking-session.abandoned')
  async handleSessionAbandoned(
    payload: SessionAbandonedPayload,
  ): Promise<void> {
    this.logger.log(
      `Session abandoned: session=${payload.sessionId} lastStep=${payload.lastStep}`,
    );

    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const existing = await this.prisma.bookingFlowAnalytics.findUnique({
        where: {
          tenantId_flowId_date: {
            tenantId: payload.tenantId,
            flowId: payload.flowId,
            date: today,
          },
        },
      });

      if (existing) {
        const stepMetrics = (existing.stepMetrics as Array<{
          step: string;
          sessions: number;
          dropOffs: number;
          avgDurationMs: number;
        }>) ?? [];

        const stepIndex = stepMetrics.findIndex(
          (s) => s.step === payload.lastStep,
        );

        if (stepIndex >= 0) {
          stepMetrics[stepIndex]!.dropOffs += 1;
        }

        const newBounceRate =
          existing.totalSessions > 0
            ? (existing.totalSessions - existing.completedSessions) /
              existing.totalSessions
            : 0;

        await this.prisma.bookingFlowAnalytics.update({
          where: { id: existing.id },
          data: {
            stepMetrics: stepMetrics as unknown as Prisma.InputJsonValue,
            bounceRate: newBounceRate,
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to record session abandonment: ${msg}`);
    }
  }
}
