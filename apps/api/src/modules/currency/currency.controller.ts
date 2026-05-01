import { Controller, Get, Query , UseGuards } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { ForexService } from './forex.service';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Currency')
@Controller('currency')
@UseGuards(AuthGuard)
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly forexService: ForexService,
  ) {}

  @Get('rate')
  @ApiOperation({ summary: 'Get exchange rate for a currency pair' })
  async getRate(
    @ActiveTenant() tenant: TenantContext,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    const d = date ? new Date(date) : new Date();
    const rate = await this.currencyService.getExchangeRate(
      tenant.companyId,
      from.toUpperCase(),
      to.toUpperCase(),
      d
    );
    return { from, to, rate, date: d.toISOString() };
  }

  @Get('list')
  @ApiOperation({ summary: 'List supported currencies' })
  async listCurrencies() {
    const list = await this.currencyService.getAvailableCurrencies();
    return { currencies: list };
  }

  @Get('reports/unrealized-gains-losses')
  @ApiOperation({ summary: 'Get unrealized gains and losses report' })
  async getUnrealizedReport(@ActiveTenant() tenant: TenantContext) {
    return this.forexService.calculateUnrealizedGainsLosses(tenant.companyId);
  }
}
