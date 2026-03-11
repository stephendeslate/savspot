import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrencyService } from './currency.service';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

@ApiTags('Currencies')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List supported currencies' })
  @ApiResponse({ status: 200, description: 'List of supported currencies with metadata' })
  async listCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Public()
  @Get('rates')
  @ApiOperation({ summary: 'Get current exchange rates (base: USD)' })
  @ApiResponse({ status: 200, description: 'Current exchange rates' })
  @ApiQuery({
    name: 'currencies',
    required: false,
    description: 'Comma-separated currency codes to filter (e.g. EUR,GBP,JPY)',
  })
  async getRates(@Query('currencies') currencies?: string) {
    const codes = currencies
      ? currencies.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;
    return this.currencyService.getRates(codes);
  }

  @Post('convert')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert an amount between currencies' })
  @ApiResponse({ status: 200, description: 'Converted amount with rate info' })
  @ApiResponse({ status: 400, description: 'Unsupported currency' })
  async convert(@Body() dto: ConvertCurrencyDto) {
    return this.currencyService.convert(dto.amount, dto.from, dto.to);
  }
}
