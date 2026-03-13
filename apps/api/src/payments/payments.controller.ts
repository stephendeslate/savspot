import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { PaymentsService } from './payments.service';
import { StripeConnectService } from './stripe-connect.service';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  /**
   * Create a Stripe Connect Express account for the tenant.
   */
  @Post('connect')
  @TenantRoles('OWNER')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create Stripe Connect account for tenant' })
  @ApiResponse({ status: 201, description: 'Connected account created' })
  @ApiResponse({ status: 400, description: 'Account already exists or invalid input' })
  async createConnectAccount(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: ConnectAccountDto,
    @CurrentUser('email') email: string,
  ) {
    return this.stripeConnectService.createAccount(
      tenantId,
      email,
      dto.country ?? 'US',
    );
  }

  /**
   * Get onboarding link for the Stripe Connect account.
   */
  @Post('connect/onboarding')
  @TenantRoles('OWNER')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get Stripe Connect onboarding link' })
  @ApiResponse({ status: 200, description: 'Onboarding link returned' })
  async getOnboardingLink(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body('returnUrl') returnUrl: string,
  ) {
    return this.stripeConnectService.getOnboardingLink(tenantId, returnUrl);
  }

  /**
   * Check the current status of the Stripe Connect account.
   */
  @Get('connect/status')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Check Stripe Connect account status' })
  @ApiResponse({ status: 200, description: 'Account status returned' })
  async getConnectStatus(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.stripeConnectService.getStatus(tenantId);
  }

  /**
   * Get the Stripe Express dashboard link.
   */
  @Post('connect/dashboard')
  @TenantRoles('OWNER')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get Stripe Express dashboard link' })
  @ApiResponse({ status: 200, description: 'Dashboard link returned' })
  async getDashboardLink(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.stripeConnectService.getDashboardLink(tenantId);
  }

  /**
   * Get payment stats for the tenant.
   */
  @Get('stats')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get payment stats for a tenant' })
  @ApiResponse({ status: 200, description: 'Payment statistics' })
  async getStats(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.paymentsService.getStats(tenantId);
  }

  /**
   * List payments for the tenant.
   */
  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List payments for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() dto: ListPaymentsDto,
  ) {
    return this.paymentsService.findAll(tenantId, {
      bookingId: dto.bookingId,
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      search: dto.search,
      page: dto.page,
      limit: dto.limit,
    });
  }

  /**
   * Get a single payment by ID.
   */
  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findById(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.paymentsService.findById(tenantId, id);
  }

  /**
   * Process a refund for a payment.
   */
  @Post(':id/refund')
  @TenantRoles('OWNER')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  @ApiResponse({ status: 400, description: 'Payment cannot be refunded' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refund(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.paymentsService.processRefund(tenantId, id, dto.amount);
  }
}
