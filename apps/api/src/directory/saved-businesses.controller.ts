import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SavedBusinessesService } from './saved-businesses.service';
import { SaveBusinessDto } from './dto/save-business.dto';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Saved Businesses')
@ApiBearerAuth()

@RequiresLicense()
@Controller('api/saved-businesses')
export class SavedBusinessesController {
  constructor(
    private readonly savedBusinessesService: SavedBusinessesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Toggle save/unsave a business' })
  @ApiResponse({ status: 201, description: 'Business saved or unsaved' })
  async toggleSave(
    @Body() dto: SaveBusinessDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.savedBusinessesService.toggleSave(userId, dto.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List saved businesses' })
  @ApiResponse({ status: 200, description: 'List of saved businesses' })
  async listSaved(@CurrentUser('sub') userId: string) {
    return this.savedBusinessesService.listSaved(userId);
  }
}
