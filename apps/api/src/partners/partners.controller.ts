import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PartnersService } from './partners.service';
import { ApplyPartnerDto } from './dto/apply-partner.dto';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)

@RequiresLicense()
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply to become a partner' })
  @ApiResponse({ status: 201, description: 'Partner application submitted' })
  @ApiResponse({ status: 409, description: 'User already has a partner application' })
  async apply(
    @CurrentUser('sub') userId: string,
    @Body() dto: ApplyPartnerDto,
  ) {
    return this.partnersService.apply(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get partner dashboard' })
  @ApiResponse({ status: 200, description: 'Partner details' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.partnersService.getPartnerByUserId(userId);
  }

  @Get('me/referrals')
  @ApiOperation({ summary: 'List referred tenants' })
  @ApiResponse({ status: 200, description: 'List of referrals' })
  async getReferrals(@CurrentUser('sub') userId: string) {
    const partner = await this.partnersService.getPartnerByUserId(userId);
    return this.partnersService.getPartnerReferrals(partner.id);
  }

  @Get('me/payouts')
  @ApiOperation({ summary: 'List payout history' })
  @ApiResponse({ status: 200, description: 'List of payouts' })
  async getPayouts(@CurrentUser('sub') userId: string) {
    const partner = await this.partnersService.getPartnerByUserId(userId);
    return this.partnersService.getPartnerPayouts(partner.id);
  }

  @Get('me/link')
  @ApiOperation({ summary: 'Get referral link' })
  @ApiResponse({ status: 200, description: 'Referral link' })
  async getReferralLink(@CurrentUser('sub') userId: string) {
    const partner = await this.partnersService.getPartnerByUserId(userId);
    return this.partnersService.getReferralLink(partner.id);
  }
}
