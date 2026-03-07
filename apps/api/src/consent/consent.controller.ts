import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsentService } from './consent.service';
import { UpdateConsentDto } from './dto/update-consent.dto';

const VALID_PURPOSES = [
  'DATA_PROCESSING',
  'MARKETING',
  'ANALYTICS',
  'THIRD_PARTY_SHARING',
  'FOLLOW_UP_EMAILS',
] as const;

@ApiTags('Consent')
@ApiBearerAuth()
@Controller('users/me/consents')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all consent records for the current user' })
  @ApiResponse({ status: 200, description: 'List of consent records' })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.consentService.findAllForUser(userId);
  }

  @Patch(':purpose')
  @ApiOperation({ summary: 'Update consent for a specific purpose' })
  @ApiResponse({ status: 200, description: 'Consent updated' })
  @ApiResponse({ status: 400, description: 'Invalid purpose' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('purpose') purpose: string,
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
  ) {
    const upperPurpose = purpose.toUpperCase();
    if (!VALID_PURPOSES.includes(upperPurpose as typeof VALID_PURPOSES[number])) {
      throw new BadRequestException(
        `Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`,
      );
    }

    return this.consentService.upsertConsent(
      userId,
      upperPurpose,
      dto.consented,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
