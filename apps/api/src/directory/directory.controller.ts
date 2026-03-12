import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { DirectoryService } from './directory.service';
import { SearchDirectoryDto } from './dto/search-directory.dto';

@ApiTags('Directory')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('api/directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search the business directory' })
  @ApiResponse({ status: 200, description: 'Paginated search results' })
  async search(@Query() dto: SearchDirectoryDto) {
    return this.directoryService.search(dto);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List business categories with counts' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories() {
    return this.directoryService.getCategories();
  }

  @Get('businesses/:slug')
  @Public()
  @ApiOperation({ summary: 'Get business profile by slug' })
  @ApiResponse({ status: 200, description: 'Business profile' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getBusinessBySlug(@Param('slug') slug: string) {
    return this.directoryService.getBusinessBySlug(slug);
  }

  @Get('businesses/:slug/reviews')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a business' })
  @ApiResponse({ status: 200, description: 'Paginated reviews' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getBusinessReviews(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.directoryService.getBusinessReviews(slug, page ?? 1, limit ?? 10);
  }

  @Get('businesses/:slug/availability')
  @Public()
  @ApiOperation({ summary: 'Get availability for a business' })
  @ApiResponse({ status: 200, description: 'Availability rules' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getBusinessAvailability(@Param('slug') slug: string) {
    return this.directoryService.getBusinessAvailability(slug);
  }
}
