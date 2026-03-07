import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OnboardingToursService } from './onboarding-tours.service';
import { UpdateTourDto } from './dto/update-tour.dto';

@ApiTags('Onboarding Tours')
@ApiBearerAuth()
@Controller('users/me/tours')
export class OnboardingToursController {
  constructor(private readonly toursService: OnboardingToursService) {}

  @Get()
  @ApiOperation({ summary: 'Get all onboarding tours for current user' })
  @ApiResponse({ status: 200, description: 'List of onboarding tours' })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.toursService.findAllForUser(userId);
  }

  @Patch(':tourKey')
  @ApiOperation({ summary: 'Complete or dismiss an onboarding tour' })
  @ApiResponse({ status: 200, description: 'Tour updated' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('tourKey') tourKey: string,
    @Body() dto: UpdateTourDto,
  ) {
    return this.toursService.updateTour(userId, tourKey, dto.action);
  }
}
