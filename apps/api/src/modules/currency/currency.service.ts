import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the exchange rate for a specific date.
   * Uses a local database cache and falls back to Bank of Canada API.
   */
  async getExchangeRate(companyId: string, from: string, to: string, date: Date = new Date()): Promise<number> {
    if (from === to) return 1.0;

    // Normalize date to midnight UTC to ensure consistency in cache keys
    const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    // 1. Check local cache
    const cached = await this.prisma.client.exchangeRate.findUnique({
      where: {
        companyId_fromCurrency_toCurrency_date: {
          companyId,
          fromCurrency: from,
          toCurrency: to,
          date: dateOnly,
        },
      },
    });

    if (cached) return cached.rate.toNumber();

    // 2. Fetch from Bank of Canada (Primary source for CAD pairs)
    if (to === 'CAD') {
      const rate = await this.fetchFromBankOfCanada(from, dateOnly);
      if (rate !== null) {
        await this.prisma.client.exchangeRate.create({
          data: {
            companyId,
            fromCurrency: from,
            toCurrency: to,
            rate,
            date: dateOnly,
          },
        });
        return rate;
      }
    }

    // 3. Fallback: try to find the latest available rate in history
    const latest = await this.prisma.client.exchangeRate.findFirst({
      where: { companyId, fromCurrency: from, toCurrency: to },
      orderBy: { date: 'desc' },
    });

    if (latest) {
      this.logger.debug(`Using latest historical rate for ${from}->${to}: ${latest.rate}`);
      return latest.rate.toNumber();
    }

    // 4. Default fallback for development/safety
    this.logger.warn(`No exchange rate found for ${from}->${to} on ${dateOnly.toISOString()}. Using default 1.35.`);
    return from === 'USD' && to === 'CAD' ? 1.35 : 1.0;
  }

  /**
   * Internal fetcher for Bank of Canada Valet API.
   */
  private async fetchFromBankOfCanada(currency: string, date: Date): Promise<number | null> {
    const dateStr = date.toISOString().split('T')[0];
    const series = `FX${currency}CAD`;
    const url = `https://www.bankofcanada.ca/valet/observations/${series}/json?start_date=${dateStr}&end_date=${dateStr}`;

    try {
      this.logger.log(`Fetching ${series} rate for ${dateStr} from Bank of Canada...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        this.logger.warn(`BoC API returned ${response.status}`);
        return null;
      }

      const data = (await response.json()) as { observations: any[] };
      const observations = data.observations;
      
      if (observations && observations.length > 0 && observations[0][series]) {
        return parseFloat(observations[0][series].v);
      }

      // If no observation for exact date (e.g. weekend/holiday), try fetching recent
      return this.fetchRecentFromBankOfCanada(currency);
    } catch (err: any) {
      this.logger.error(`Failed to fetch rate from BoC: ${err.message}`);
      return null;
    }
  }

  private async fetchRecentFromBankOfCanada(currency: string): Promise<number | null> {
    const series = `FX${currency}CAD`;
    const url = `https://www.bankofcanada.ca/valet/observations/${series}/json?recent=5`;

    try {
      const response = await fetch(url);
      const data = (await response.json()) as { observations: any[] };
      const observations = data.observations;
      if (observations && observations.length > 0) {
        const last = observations[observations.length - 1];
        return parseFloat(last[series].v);
      }
    } catch (e) {}
    return null;
  }

  async getAvailableCurrencies() {
    return ['CAD', 'USD', 'EUR', 'GBP', 'JPY', 'CHF'];
  }
}
