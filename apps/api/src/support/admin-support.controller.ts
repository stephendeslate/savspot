import {
  Controller,
  Get,
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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { SupportService } from './support.service';
import { AdminListTicketsDto } from './dto/admin-list-tickets.dto';
import { AdminUpdateTicketDto } from './dto/admin-update-ticket.dto';

@ApiTags('Admin Support')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('PLATFORM_ADMIN')
@Controller('admin/support-tickets')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'List all support tickets (admin)' })
  @ApiResponse({ status: 200, description: 'List of all support tickets' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listTickets(@Query() query: AdminListTicketsDto) {
    return this.supportService.adminListTickets({
      status: query.status,
      severity: query.severity,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a support ticket (admin)' })
  @ApiResponse({ status: 200, description: 'Ticket updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async updateTicket(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: AdminUpdateTicketDto,
  ) {
    return this.supportService.adminUpdateTicket(id, {
      status: dto.status,
      developerNotes: dto.developerNotes,
    });
  }
}
