import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'List all API keys for a tenant' })
  @ApiResponse({ status: 200, description: 'List of API keys (without hashes)' })
  async findAll(@Param('tenantId', UuidValidationPipe) tenantId: string) {
    return this.apiKeyService.findAll(tenantId);
  }

  @Post()
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created. The raw key is returned once and cannot be retrieved again.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    const result = await this.apiKeyService.generateKey(
      tenantId,
      userId,
      dto.name,
      dto.permissions,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );

    return {
      message: 'API key created. Store the key securely — it will not be shown again.',
      key: result.rawKey,
      apiKey: result.apiKey,
    };
  }

  @Delete(':id')
  @TenantRoles('OWNER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revoke(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    const apiKey = await this.apiKeyService.revoke(tenantId, id);
    return { message: 'API key revoked', apiKey };
  }
}
