import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PublicBookingService } from './public-booking.service';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Public Booking')
@Controller('book')
export class PublicBookingController {
  constructor(
    private readonly publicBookingService: PublicBookingService,
  ) {}

  @Get('slugs')
  @Public()
  @ApiOperation({ summary: 'List all active booking page slugs (for sitemap)' })
  @ApiResponse({ status: 200, description: 'Array of slug strings' })
  async listSlugs() {
    return this.publicBookingService.listActiveBookingSlugs();
  }

  @Get(':slug/qr')
  @Public()
  @ApiOperation({ summary: 'Generate QR code for booking page' })
  @ApiResponse({ status: 200, description: 'QR code PNG image' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getQrCode(
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    const buffer = await this.publicBookingService.generateQrCode(slug);
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=86400',
    });
    res.end(buffer);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Get tenant public profile and services by slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant public profile with active services',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getTenantBySlug(@Param('slug') slug: string) {
    return this.publicBookingService.getTenantBySlug(slug);
  }

  @Get(':slug/services/:serviceId')
  @Public()
  @ApiOperation({
    summary: 'Get service detail with availability for booking flow',
  })
  @ApiResponse({
    status: 200,
    description: 'Service detail with availability rules',
  })
  @ApiResponse({ status: 404, description: 'Service or business not found' })
  async getServiceDetail(
    @Param('slug') slug: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
  ) {
    return this.publicBookingService.getServiceDetail(slug, serviceId);
  }
}
