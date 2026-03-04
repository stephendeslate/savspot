import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';

@ApiTags('Discounts')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/discounts')
export class DiscountsAdminController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List all discounts for a tenant' })
  @ApiResponse({ status: 200, description: 'List of discounts' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.discountsService.findAll(tenantId);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({ status: 201, description: 'Discount created' })
  @ApiResponse({ status: 409, description: 'Discount code already exists' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.discountsService.create(tenantId, dto);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a discount' })
  @ApiResponse({ status: 200, description: 'Discount updated' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.discountsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a discount (soft delete)' })
  @ApiResponse({ status: 200, description: 'Discount deactivated' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async deactivate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.discountsService.deactivate(tenantId, id);
  }
}

@ApiTags('Discount Validation')
@Controller('booking-sessions/:sessionId/apply-discount')
export class DiscountValidationController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Validate a discount code for a booking session' })
  @ApiResponse({ status: 200, description: 'Discount is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired discount code' })
  @ApiResponse({ status: 404, description: 'Booking session not found' })
  async applyDiscount(
    @Param('sessionId', UuidValidationPipe) sessionId: string,
    @Body() dto: ApplyDiscountDto,
  ) {
    return this.discountsService.validateForSession(sessionId, dto.code);
  }
}
