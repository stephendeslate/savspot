import {
  Controller,
  Get,
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
import { InvoicesService } from './invoices.service';
import { ListInvoicesDto } from './dto/list-invoices.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List invoices for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListInvoicesDto,
  ) {
    return this.invoicesService.findAll(tenantId, query);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findById(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.invoicesService.findById(tenantId, id);
  }
}
