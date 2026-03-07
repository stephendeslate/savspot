import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ClientPortalService } from './client-portal.service';
import { ListPortalBookingsDto } from './dto/list-portal-bookings.dto';
import { CancelPortalBookingDto } from './dto/cancel-portal-booking.dto';
import { ReschedulePortalBookingDto } from './dto/reschedule-portal-booking.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Client Portal')
@ApiBearerAuth()
@Controller('portal')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  // ──────────────────────────────────────────────
  //  Dashboard
  // ──────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get client dashboard',
    description:
      'Returns upcoming bookings (next 7 days), recent payments, and aggregate stats.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@CurrentUser('sub') userId: string) {
    return this.clientPortalService.getDashboard(userId);
  }

  // ──────────────────────────────────────────────
  //  Bookings
  // ──────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({
    summary: 'List client bookings',
    description:
      'Paginated list of all bookings across tenants for the authenticated client.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of bookings' })
  async findAllBookings(
    @CurrentUser('sub') userId: string,
    @Query() query: ListPortalBookingsDto,
  ) {
    return this.clientPortalService.findAllBookings(userId, query);
  }

  @Get('bookings/:id')
  @ApiOperation({
    summary: 'Get booking detail',
    description:
      'Returns a single booking with service, tenant, payments, and state history.',
  })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findBookingById(
    @CurrentUser('sub') userId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.clientPortalService.findBookingById(userId, id);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Cancels a PENDING or CONFIRMED booking. Evaluates the service cancellation policy to determine if a late fee applies. If a succeeded payment exists, flags it for refund processing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled with cancellation details',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state — booking cannot be cancelled',
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(
    @CurrentUser('sub') userId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CancelPortalBookingDto,
  ) {
    return this.clientPortalService.cancelBooking(userId, id, dto.reason);
  }

  @Post('bookings/:id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request booking reschedule',
    description:
      'Reschedules a PENDING or CONFIRMED booking to a new date/time. Enforces max reschedule count from service config.',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking rescheduled with previous and new times',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state or max reschedules reached',
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async rescheduleBooking(
    @CurrentUser('sub') userId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: ReschedulePortalBookingDto,
  ) {
    return this.clientPortalService.requestReschedule(
      userId,
      id,
      dto.startTime,
      dto.endTime,
      dto.reason,
    );
  }

  // ──────────────────────────────────────────────
  //  Payments / Invoices
  // ──────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({
    summary: 'List client invoices and payments',
    description: 'Paginated list of invoices with payments across all tenants.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of invoices with payments',
  })
  async findAllPayments(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.clientPortalService.findAllPayments(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // ──────────────────────────────────────────────
  //  Profile
  // ──────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({
    summary: 'Get client profile',
    description: 'Returns the authenticated user profile.',
  })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.clientPortalService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update client profile',
    description: 'Update the authenticated user name, email, or phone.',
  })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 400, description: 'Validation error or email in use' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.clientPortalService.updateProfile(userId, dto);
  }

  // ──────────────────────────────────────────────
  //  GDPR / Data Requests
  // ──────────────────────────────────────────────

  @Post('data-export')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request data export',
    description:
      'Creates a GDPR data export request (type: EXPORT, status: PENDING). Processing is handled asynchronously.',
  })
  @ApiResponse({ status: 201, description: 'Data export request created' })
  async requestDataExport(@CurrentUser('sub') userId: string) {
    return this.clientPortalService.requestDataExport(userId);
  }

  @Post('account-deletion')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request account deletion',
    description:
      'Creates a GDPR account deletion request (type: DELETION, status: PENDING). Fails if the user has active bookings.',
  })
  @ApiResponse({ status: 201, description: 'Account deletion request created' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete — active bookings exist',
  })
  async requestAccountDeletion(@CurrentUser('sub') userId: string) {
    return this.clientPortalService.requestAccountDeletion(userId);
  }
}
