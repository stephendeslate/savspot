import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { BookingsService } from './bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { WalkInBookingDto } from './dto/walk-in-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { MarkPaidDto } from '../payments/dto/mark-paid.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List bookings for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of bookings' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListBookingsDto,
  ) {
    return this.bookingsService.findAll(tenantId, query);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findById(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.bookingsService.findById(tenantId, id);
  }

  @Post(':id/confirm')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Confirm a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async confirm(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookingsService.confirm(tenantId, id, userId);
  }

  @Post(':id/cancel')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async cancel(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(tenantId, id, userId, dto.reason);
  }

  @Post(':id/reschedule')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reschedule a booking' })
  @ApiResponse({ status: 200, description: 'Booking rescheduled' })
  @ApiResponse({ status: 400, description: 'Cannot reschedule' })
  @ApiResponse({ status: 409, description: 'Time slot not available' })
  async reschedule(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.reschedule(
      tenantId,
      id,
      userId,
      dto.startTime,
      dto.endTime,
    );
  }

  @Post(':id/no-show')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Mark a booking as no-show' })
  @ApiResponse({ status: 200, description: 'Booking marked as no-show' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async markNoShow(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookingsService.markNoShow(tenantId, id, userId);
  }

  @Post('walk-in')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a walk-in booking' })
  @ApiResponse({ status: 201, description: 'Walk-in booking created' })
  @ApiResponse({ status: 409, description: 'Time slot not available' })
  async createWalkIn(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: WalkInBookingDto,
  ) {
    return this.bookingsService.createWalkIn(tenantId, dto, userId);
  }

  @Post(':id/mark-paid')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Mark a booking as paid (offline payment)' })
  @ApiResponse({ status: 200, description: 'Payment recorded' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async markPaid(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.paymentsService.markPaid(
      tenantId,
      id,
      dto.amount,
      dto.currency,
      dto.paymentMethod,
    );
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Update booking notes' })
  @ApiResponse({ status: 200, description: 'Booking updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(tenantId, id, dto.notes);
  }
}
