import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BookingSessionsService } from './booking-sessions.service';
import { ReservationService } from './reservation.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ReserveSlotDto } from './dto/reserve-slot.dto';
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Booking Sessions')
@Controller('booking-sessions')
export class BookingSessionsController {
  constructor(
    private readonly sessionsService: BookingSessionsService,
    private readonly reservationService: ReservationService,
  ) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a new booking session' })
  @ApiResponse({ status: 201, description: 'Booking session created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto.tenantId, dto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a booking session by ID' })
  @ApiResponse({ status: 200, description: 'Booking session details' })
  @ApiResponse({ status: 404, description: 'Booking session not found' })
  async findById(@Param('id', UuidValidationPipe) id: string) {
    // tenantId is embedded in the session — we look up without scoping to avoid
    // requiring auth on the public booking widget. The session itself is the auth token.
    const session = await this.sessionsService.findByIdPublic(id);
    return session;
  }

  @Patch(':id')
  @Public()
  @ApiOperation({ summary: 'Update a booking session' })
  @ApiResponse({ status: 200, description: 'Booking session updated' })
  @ApiResponse({ status: 404, description: 'Booking session not found' })
  @ApiResponse({ status: 400, description: 'Invalid state for update' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    // Look up session to get tenantId
    const session = await this.sessionsService.findByIdPublic(id);
    return this.sessionsService.update(session.tenantId, id, dto);
  }

  @Post(':id/reserve')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve a time slot for this session' })
  @ApiResponse({ status: 201, description: 'Slot reserved' })
  @ApiResponse({ status: 409, description: 'Slot already reserved or booked' })
  @ApiResponse({ status: 404, description: 'Booking session not found' })
  async reserveSlot(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: ReserveSlotDto,
  ) {
    const session = await this.sessionsService.findByIdPublic(id);

    // Preview mode: skip real reservation, return mock data
    const sessionData = (session.data ?? {}) as Record<string, unknown>;
    if (sessionData['isPreview'] === true) {
      return {
        id: `preview-res-${id}`,
        tenant_id: session.tenantId,
        session_id: id,
        venue_id: dto.venueId ?? null,
        service_id: dto.serviceId,
        staff_id: dto.staffId ?? null,
        reserved_date: new Date(dto.startTime),
        start_time: new Date(dto.startTime),
        end_time: new Date(dto.endTime),
        token: `preview-token-${id}`,
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        status: 'HELD',
        created_at: new Date(),
        preview: true,
      };
    }

    return this.reservationService.reserveSlot({
      tenantId: session.tenantId,
      sessionId: id,
      serviceId: dto.serviceId,
      venueId: dto.venueId,
      staffId: dto.staffId,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
    });
  }

  @Post(':id/release')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a held reservation for this session' })
  @ApiResponse({ status: 200, description: 'Reservation released' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async releaseReservation(@Param('id', UuidValidationPipe) id: string) {
    const session = await this.sessionsService.findByIdPublic(id);
    await this.reservationService.releaseAllForSession(session.tenantId, id);
    return { message: 'Reservations released' };
  }

  @Post(':id/pay')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payment for a booking session' })
  @ApiResponse({ status: 200, description: 'Payment intent created' })
  @ApiResponse({ status: 400, description: 'Session cannot accept payment' })
  @ApiResponse({ status: 404, description: 'Booking session not found' })
  async processPayment(@Param('id', UuidValidationPipe) id: string) {
    return this.sessionsService.processPayment(id);
  }

  @Post(':id/complete')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Complete a booking session and create a booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Session cannot be completed' })
  @ApiResponse({ status: 404, description: 'Booking session not found' })
  async complete(@Param('id', UuidValidationPipe) id: string) {
    const session = await this.sessionsService.findByIdPublic(id);
    return this.sessionsService.complete(session.tenantId, id);
  }
}
