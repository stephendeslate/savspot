import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { CommunicationsComposeService } from './communications-compose.service';
import { ComposeMessageDto } from './dto/compose-message.dto';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/communications')
export class CommunicationsComposeController {
  constructor(private readonly composeService: CommunicationsComposeService) {}

  @Post('compose')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Send an ad-hoc email or SMS from Admin CRM' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiResponse({ status: 201, description: 'Message queued for delivery' })
  @ApiResponse({ status: 400, description: 'Invalid channel or recipient' })
  async compose(
    @Param('tenantId') tenantId: string,
    @Body() dto: ComposeMessageDto,
  ) {
    return this.composeService.compose(tenantId, dto);
  }
}
