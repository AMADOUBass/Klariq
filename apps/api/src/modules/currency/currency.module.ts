import { Module, Global } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { ForexService } from './forex.service';

@Global()
@Module({
  controllers: [CurrencyController],
  providers: [CurrencyService, ForexService],
  exports: [CurrencyService, ForexService],
})
export class CurrencyModule {}
