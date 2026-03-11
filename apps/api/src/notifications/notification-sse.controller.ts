import { Controller, Sse, Req, UseGuards } from '@nestjs/common';
import { Observable, Subject, interval, map, merge, takeUntil, finalize } from 'rxjs';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';

interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/notifications')
export class NotificationSseController {
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  @Sse('stream')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Subscribe to real-time notifications via SSE' })
  @ApiResponse({ status: 200, description: 'SSE stream established' })
  stream(@Req() req: Request): Observable<MessageEvent> {
    const user = req.user as { sub?: string; id?: string; tenantId?: string };
    const userId = user.sub ?? user.id ?? '';
    const tenantId = (req.params as Record<string, string>)['tenantId'] ?? user.tenantId ?? '';
    const key = `${tenantId}:${userId}`;

    const subject = new Subject<MessageEvent>();
    this.streams.set(key, subject);

    const heartbeat$ = interval(30000).pipe(
      map(() => ({ data: 'heartbeat', type: 'heartbeat' }) as MessageEvent),
    );

    const disconnect$ = new Subject<void>();
    req.on('close', () => {
      disconnect$.next();
      disconnect$.complete();
      this.streams.delete(key);
    });

    return merge(subject.asObservable(), heartbeat$).pipe(
      takeUntil(disconnect$),
      finalize(() => this.streams.delete(key)),
    );
  }

  pushToUser(tenantId: string, userId: string, notification: unknown): void {
    const key = `${tenantId}:${userId}`;
    const subject = this.streams.get(key);
    if (subject) {
      subject.next({
        data: JSON.stringify(notification),
        type: 'notification',
      });
    }
  }
}
