import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PreferenceCenterService } from './preference-center.service';
import { UpdatePreferenceCenterDto } from './dto/update-preference-center.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Preference Center')
@Controller('preferences')
export class PreferenceCenterController {
  constructor(private readonly preferenceCenterService: PreferenceCenterService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get notification preferences via unsubscribe token' })
  @ApiParam({ name: 'token', description: 'Unsubscribe token from email footer' })
  @ApiResponse({ status: 200, description: 'Current preferences' })
  @ApiResponse({ status: 404, description: 'Invalid or expired token' })
  async getPreferences(@Param('token') token: string) {
    return this.preferenceCenterService.getByToken(token);
  }

  @Post(':token')
  @Public()
  @ApiOperation({ summary: 'Update notification preferences or unsubscribe' })
  @ApiParam({ name: 'token', description: 'Unsubscribe token from email footer' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 404, description: 'Invalid or expired token' })
  async updatePreferences(
    @Param('token') token: string,
    @Body() dto: UpdatePreferenceCenterDto,
  ) {
    return this.preferenceCenterService.updateByToken(token, dto);
  }
}
