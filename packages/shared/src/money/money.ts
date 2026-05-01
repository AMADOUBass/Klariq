import Decimal from 'decimal.js';
import { z } from 'zod';

// ─── Money invariant ─────────────────────────────────────────────────────────
// No monetary value crosses ANY boundary as a JS number.
// toJSON() always returns a string decimal. Zod schemas at all API boundaries
// enforce string input. The Postgres column type is NUMERIC(19,4).
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const MoneySchema = z.object({
  amount: z
    .string()
    .regex(/^-?\d{1,15}(\.\d{1,4})?$/, 'Invalid decimal amount — use string form with up to 4 decimal places'),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export type MoneyDTO = z.infer<typeof MoneySchema>;

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Immutable Money value object.
 *
 * Rules:
 *  - Constructed only via Money.of() or Money.fromDTO() — never `new Money()`
 *  - toJSON() serialises as { amount: string, currency: string } — NEVER a number
 *  - Arithmetic throws if currencies differ
 *  - Stored in Postgres as NUMERIC(19,4); always round to 4dp before persisting
 */
export class Money {
  private readonly _amount: Decimal;
  private readonly _currency: CurrencyCode;

  private constructor(amount: Decimal, currency: CurrencyCode) {
    this._amount = amount;
    this._currency = currency;
  }

  static of(amount: string | Decimal, currency: CurrencyCode): Money {
    return new Money(new Decimal(amount), currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(new Decimal(0), currency);
  }

  static fromDTO(dto: MoneyDTO): Money {
    return Money.of(dto.amount, dto.currency);
  }

  get amount(): Decimal {
    return this._amount;
  }

  get currency(): CurrencyCode {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount.plus(other._amount), this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount.minus(other._amount), this._currency);
  }

  multiply(factor: string | number | Decimal): Money {
    return new Money(this._amount.times(new Decimal(factor)), this._currency);
  }

  abs(): Money {
    return new Money(this._amount.abs(), this._currency);
  }

  negate(): Money {
    return new Money(this._amount.negated(), this._currency);
  }

  roundTo4dp(): Money {
    return new Money(this._amount.toDecimalPlaces(4, Decimal.ROUND_HALF_UP), this._currency);
  }

  isZero(): boolean {
    return this._amount.isZero();
  }

  isPositive(): boolean {
    return this._amount.isPositive() && !this._amount.isZero();
  }

  isNegative(): boolean {
    return this._amount.isNegative();
  }

  equals(other: Money): boolean {
    return this._currency === other._currency && this._amount.equals(other._amount);
  }

  compareTo(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    const cmp = this._amount.comparedTo(other._amount);
    return cmp < 0 ? -1 : cmp > 0 ? 1 : 0;
  }

  toDTO(): MoneyDTO {
    return {
      amount: this._amount.toFixed(4),
      currency: this._currency,
    };
  }

  /** Serialises as a plain object with string amount — NEVER a JS number. */
  toJSON(): { amount: string; currency: CurrencyCode } {
    return this.toDTO();
  }

  toString(): string {
    return `${this._amount.toFixed(4)} ${this._currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this._currency} and ${other._currency}. ` +
          `Convert via an exchange rate first.`,
      );
    }
  }
}
