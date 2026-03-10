import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { SetSatisfactionDto } from './dto/set-satisfaction.dto';

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

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen a resolved/closed ticket (creates a new linked ticket)' })
  @ApiResponse({ status: 200, description: 'New ticket created linked to the original' })
  @ApiResponse({ status: 400, description: 'Ticket is not in a reopenable state' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async reopenTicket(
    @CurrentUser('sub') userId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: ReopenTicketDto,
  ) {
    return this.supportService.reopenTicket(userId, id, dto.reason);
  }

  @Patch(':id/satisfaction')
  @ApiOperation({ summary: 'Set satisfaction rating on a resolved ticket' })
  @ApiResponse({ status: 200, description: 'Satisfaction recorded' })
  @ApiResponse({ status: 400, description: 'Ticket is not resolved' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async setSatisfaction(
    @CurrentUser('sub') userId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: SetSatisfactionDto,
  ) {
    return this.supportService.setSatisfaction(userId, id, dto.helpful);
  }
}
