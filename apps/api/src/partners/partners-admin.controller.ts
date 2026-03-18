import {
  Controller,
  Get,
  Patch,
  Post,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { PartnersService } from './partners.service';
import { PartnerPayoutService } from './partner-payout.service';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Partners Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')

@RequiresLicense()
@Controller('admin/partners')
export class PartnersAdminController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly partnerPayoutService: PartnerPayoutService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all partners' })
  @ApiResponse({ status: 200, description: 'Paginated list of partners' })
  async listPartners(@Query('status') status?: string) {
    return this.partnersService.listPartners(status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update partner status or commission rate' })
  @ApiResponse({ status: 200, description: 'Partner updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async updatePartner(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser('sub') adminUserId: string,
  ) {
    if (dto.status) {
      await this.partnersService.updatePartnerStatus(id, dto.status, adminUserId);
    }
    if (dto.commissionRate !== undefined) {
      return this.partnersService.updatePartner(id, undefined, dto.commissionRate);
    }
    if (dto.status) {
      return this.partnersService.updatePartnerStatus(id, dto.status, adminUserId);
    }
    return { message: 'No updates provided' };
  }

  @Post('payouts/process')
  @ApiOperation({ summary: 'Trigger payout batch processing' })
  @ApiResponse({ status: 201, description: 'Payout batch processed' })
  async processPayouts() {
    return this.partnerPayoutService.processPayoutBatch();
  }
}
