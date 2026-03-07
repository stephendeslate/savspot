import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
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
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { BookingFlowService } from './booking-flow.service';
import { UpdateBookingFlowDto } from './dto/update-booking-flow.dto';

@ApiTags('Booking Flow')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/booking-flow')
export class BookingFlowController {
  constructor(private readonly bookingFlowService: BookingFlowService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get booking flow with resolved steps' })
  @ApiResponse({ status: 200, description: 'Booking flow with step resolution' })
  async getBookingFlow(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.bookingFlowService.getBookingFlow(tenantId);
  }

  @Patch()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update booking flow settings' })
  @ApiResponse({ status: 200, description: 'Booking flow updated' })
  async updateBookingFlow(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: UpdateBookingFlowDto,
  ) {
    return this.bookingFlowService.updateBookingFlow(tenantId, dto);
  }
}
