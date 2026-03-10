import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

interface AuthenticatedUser {
  sub?: string;
  id: string;
  tenantId?: string;
}

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return true;
    }

    const params = request.params as Record<string, string> | undefined;
    const tenantId =
      params?.['tenantId'] ?? params?.['id'] ?? user.tenantId;

    if (!tenantId) {
      return true;
    }

    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });

    if (!tenant) {
      return true;
    }

    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant account is suspended');
    }

    return true;
  }
}
