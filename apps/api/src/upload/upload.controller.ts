import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { UploadService, PresignedUploadResult } from './upload.service';
import { Request } from 'express';

class PresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a presigned URL for direct file upload to R2' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPresignedUrl(
    @Body() dto: PresignedUrlDto,
    @Req() req: Request,
  ): Promise<PresignedUploadResult> {
    const user = req.user as { tenantId?: string };
    const tenantId = user?.tenantId || 'default';

    return this.uploadService.getPresignedUploadUrl({
      tenantId,
      fileName: dto.fileName,
      contentType: dto.contentType,
    });
  }
}
