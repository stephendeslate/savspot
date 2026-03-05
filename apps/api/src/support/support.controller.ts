import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createTicket(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string | null,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(userId, tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List your support tickets' })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async listTickets(@CurrentUser('sub') userId: string) {
    return this.supportService.listTickets(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a support ticket by ID' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicket(
    @CurrentUser('sub') userId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supportService.getTicket(userId, id);
  }
}
