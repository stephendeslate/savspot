import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { StripeProvider } from '../payments/providers/stripe.provider';

type SubscriptionTierType = 'STARTER' | 'TEAM' | 'BUSINESS';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
  ) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of plans with pricing' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get(':tenantId/current')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get current subscription details' })
  @ApiResponse({ status: 200, description: 'Current subscription' })
  async getCurrentSubscription(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.subscriptionsService.getCurrentSubscription(tenantId);
  }

  @Post(':tenantId/checkout')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a Stripe Checkout session for upgrade' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async createCheckoutSession(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.subscriptionsService.createCheckoutSession(
      tenantId,
      dto.tier,
      dto.isAnnual,
      dto.seatCount,
    );
  }

  @Post(':tenantId/portal')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session' })
  @ApiResponse({ status: 201, description: 'Portal session created' })
  async createPortalSession(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.subscriptionsService.createPortalSession(tenantId);
  }

  @Get(':tenantId/entitlements')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get current tier entitlements' })
  @ApiResponse({ status: 200, description: 'Feature entitlements for current tier' })
  async getEntitlements(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    const subscription =
      await this.subscriptionsService.getCurrentSubscription(tenantId);
    return this.subscriptionsService.getEntitlements(
      subscription.tier as SubscriptionTierType,
    );
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 500, ttl: 60_000 } })
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe subscription webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body not available — ensure rawBody is enabled in NestFactory.create',
      );
    }

    if (!webhookSecret) {
      this.logger.warn('No Stripe webhook secret configured — cannot verify');
      throw new BadRequestException('Webhook secret not configured');
    }

    let event;
    try {
      event = this.stripeProvider.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      this.logger.error('Subscription webhook signature verification failed');
      throw new BadRequestException('Webhook signature verification failed');
    }

    const existingLog = await this.prisma.paymentWebhookLog.findUnique({
      where: { eventId: event.id },
    });

    if (existingLog) {
      this.logger.log(
        `Duplicate subscription webhook event ${event.id} (${event.type}) — skipping`,
      );
      return { received: true };
    }

    const logEntry = await this.prisma.paymentWebhookLog.create({
      data: {
        gateway: 'STRIPE',
        eventType: event.type,
        eventId: event.id,
        rawData: event.data.object as unknown as Prisma.InputJsonValue,
        processed: false,
      },
    });

    try {
      await this.subscriptionsService.handleWebhook(event);

      await this.prisma.paymentWebhookLog.update({
        where: { id: logEntry.id },
        data: { processed: true },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';

      await this.prisma.paymentWebhookLog.update({
        where: { id: logEntry.id },
        data: { processingError: errorMessage },
      });

      await this.prisma.webhookDeadLetter.create({
        data: {
          webhookLogId: logEntry.id,
          finalError: errorMessage,
          retryCount: 0,
        },
      });

      this.logger.error(
        `Error processing subscription webhook ${event.type}: ${errorMessage}`,
      );
    }

    return { received: true };
  }
}
