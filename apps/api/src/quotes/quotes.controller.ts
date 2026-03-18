import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { CreateQuoteLineItemDto } from './dto/create-quote-line-item.dto';
import { UpdateQuoteLineItemDto } from './dto/update-quote-line-item.dto';
import { AcceptQuoteDto } from './dto/accept-quote.dto';
import { ListQuotesDto } from './dto/list-quotes.dto';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)

@RequiresLicense()
@Controller('tenants/:tenantId/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List quotes for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of quotes' })
  async listQuotes(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListQuotesDto,
  ) {
    return this.quotesService.listQuotes(tenantId, query);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created' })
  async createQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.createQuote(tenantId, dto);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get quote details' })
  @ApiResponse({ status: 200, description: 'Quote details' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async getQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotesService.getQuote(tenantId, id);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a draft quote' })
  @ApiResponse({ status: 200, description: 'Quote updated' })
  @ApiResponse({ status: 400, description: 'Quote is not in DRAFT status' })
  async updateQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.updateQuote(tenantId, id, dto);
  }

  @Post(':id/line-items')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a line item to a quote' })
  @ApiResponse({ status: 201, description: 'Line item added' })
  @ApiResponse({ status: 400, description: 'Quote is not in DRAFT status' })
  async addLineItem(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CreateQuoteLineItemDto,
  ) {
    return this.quotesService.addLineItem(tenantId, id, dto);
  }

  @Patch('line-items/:itemId')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a quote line item' })
  @ApiResponse({ status: 200, description: 'Line item updated' })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  async updateLineItem(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('itemId', UuidValidationPipe) itemId: string,
    @Body() dto: UpdateQuoteLineItemDto,
  ) {
    return this.quotesService.updateLineItem(tenantId, itemId, dto);
  }

  @Delete('line-items/:itemId')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete a quote line item' })
  @ApiResponse({ status: 200, description: 'Line item deleted' })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  async deleteLineItem(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('itemId', UuidValidationPipe) itemId: string,
  ) {
    return this.quotesService.deleteLineItem(tenantId, itemId);
  }

  @Post(':id/revise')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a revised copy of a quote' })
  @ApiResponse({ status: 201, description: 'Revised quote created' })
  @ApiResponse({ status: 400, description: 'Quote cannot be revised' })
  async reviseQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotesService.reviseQuote(tenantId, id);
  }

  @Post(':id/send')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Send a draft quote' })
  @ApiResponse({ status: 200, description: 'Quote sent' })
  @ApiResponse({ status: 400, description: 'Quote is not in DRAFT status' })
  async sendQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotesService.sendQuote(tenantId, id);
  }

  @Post(':id/accept')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Accept a sent quote' })
  @ApiResponse({ status: 200, description: 'Quote accepted' })
  @ApiResponse({ status: 400, description: 'Quote is not in SENT status' })
  async acceptQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: AcceptQuoteDto,
  ) {
    return this.quotesService.acceptQuote(tenantId, id, dto);
  }

  @Post(':id/remind')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Send reminder for a pending quote' })
  @ApiResponse({ status: 200, description: 'Reminder sent' })
  @ApiResponse({ status: 400, description: 'Quote is not in SENT status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async sendReminder(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotesService.sendReminder(tenantId, id);
  }

  @Post(':id/reject')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Reject a sent quote' })
  @ApiResponse({ status: 200, description: 'Quote rejected' })
  @ApiResponse({ status: 400, description: 'Quote is not in SENT status' })
  async rejectQuote(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotesService.rejectQuote(tenantId, id);
  }
}
