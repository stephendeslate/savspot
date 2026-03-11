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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { VoidContractDto } from './dto/void-contract.dto';
import { AmendContractDto } from './dto/amend-contract.dto';
import { ListContractsDto } from './dto/list-contracts.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List contracts for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of contracts' })
  async listContracts(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListContractsDto,
  ) {
    return this.contractsService.listContracts(tenantId, query);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a contract from a template' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createContract(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.createContract(tenantId, dto);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get contract details' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async getContract(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.contractsService.getContract(tenantId, id);
  }

  @Post(':id/send')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Send a draft contract for signing' })
  @ApiResponse({ status: 200, description: 'Contract sent' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async sendContract(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.contractsService.sendContract(tenantId, id);
  }

  @Post(':id/sign')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Sign a contract' })
  @ApiResponse({ status: 200, description: 'Contract signed' })
  @ApiResponse({ status: 400, description: 'Invalid state or missing disclosure' })
  async signContract(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SignContractDto,
  ) {
    return this.contractsService.signContract(tenantId, id, userId, dto);
  }

  @Post(':id/void')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Void a contract' })
  @ApiResponse({ status: 200, description: 'Contract voided' })
  @ApiResponse({ status: 400, description: 'Contract already voided' })
  async voidContract(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: VoidContractDto,
  ) {
    return this.contractsService.voidContract(tenantId, id, userId, dto.reason);
  }

  @Post(':id/amend')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Request an amendment to a signed contract' })
  @ApiResponse({ status: 200, description: 'Amendment created' })
  @ApiResponse({ status: 400, description: 'Contract must be signed to amend' })
  async amendContract(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AmendContractDto,
  ) {
    return this.contractsService.amendContract(tenantId, id, userId, dto);
  }
}

@ApiTags('Contract Templates')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/contract-templates')
export class ContractTemplatesController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List contract templates' })
  @ApiResponse({ status: 200, description: 'List of active templates' })
  async listTemplates(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.contractsService.listTemplates(tenantId);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a contract template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateContractTemplateDto,
  ) {
    return this.contractsService.createTemplate(tenantId, dto);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a contract template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateContractTemplateDto,
  ) {
    return this.contractsService.updateTemplate(tenantId, id, dto);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Soft-delete a contract template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.contractsService.deleteTemplate(tenantId, id);
  }
}
