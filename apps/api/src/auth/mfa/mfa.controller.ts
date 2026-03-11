import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { MfaTokenDto } from './dto/mfa-token.dto';
import { MfaChallengeDto } from './dto/mfa-challenge.dto';
import { MfaRecoveryChallengeDto } from './dto/mfa-recovery-challenge.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth - MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @ApiBearerAuth()
  @Post('setup')
  @ApiOperation({ summary: 'Initiate MFA setup — generate TOTP secret and QR URL' })
  @ApiResponse({ status: 201, description: 'MFA secret and OTP auth URL returned' })
  @ApiResponse({ status: 400, description: 'MFA already enabled' })
  async setup(@CurrentUser('sub') userId: string) {
    return this.mfaService.initSetup(userId);
  }

  @ApiBearerAuth()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP token and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled, recovery codes returned' })
  @ApiResponse({ status: 400, description: 'Invalid token or MFA not initiated' })
  async verify(
    @CurrentUser('sub') userId: string,
    @Body() dto: MfaTokenDto,
  ) {
    return this.mfaService.confirmSetup(userId, dto.token);
  }

  @ApiBearerAuth()
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA (requires valid TOTP token)' })
  @ApiResponse({ status: 200, description: 'MFA disabled' })
  @ApiResponse({ status: 400, description: 'Invalid token or MFA not enabled' })
  async disable(
    @CurrentUser('sub') userId: string,
    @Body() dto: MfaTokenDto,
  ) {
    await this.mfaService.disableMfa(userId, dto.token);
    return { message: 'MFA disabled successfully' };
  }

  @Public()
  @Post('challenge')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP during login flow' })
  @ApiResponse({ status: 200, description: 'MFA verified, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid MFA token' })
  async challenge(@Body() dto: MfaChallengeDto) {
    return this.mfaService.verifyMfaChallenge(dto.userId, dto.token);
  }

  @Public()
  @Post('recovery')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Use a recovery code during login flow' })
  @ApiResponse({ status: 200, description: 'Recovery code accepted, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid recovery code' })
  async recovery(@Body() dto: MfaRecoveryChallengeDto) {
    return this.mfaService.useRecoveryCode(dto.userId, dto.code);
  }
}
