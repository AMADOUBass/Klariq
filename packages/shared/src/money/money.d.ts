import Decimal from 'decimal.js';
import { z } from 'zod';
export declare const SUPPORTED_CURRENCIES: readonly ["CAD", "USD", "EUR", "GBP"];
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export declare const MoneySchema: z.ZodObject<{
    amount: z.ZodString;
    currency: z.ZodEnum<["CAD", "USD", "EUR", "GBP"]>;
}, "strip", z.ZodTypeAny, {
    currency: "CAD" | "USD" | "EUR" | "GBP";
    amount: string;
}, {
    currency: "CAD" | "USD" | "EUR" | "GBP";
    amount: string;
}>;
export type MoneyDTO = z.infer<typeof MoneySchema>;
/**
 * Immutable Money value object.
 *
 * Rules:
 *  - Constructed only via Money.of() or Money.fromDTO() — never `new Money()`
 *  - toJSON() serialises as { amount: string, currency: string } — NEVER a number
 *  - Arithmetic throws if currencies differ
 *  - Stored in Postgres as NUMERIC(19,4); always round to 4dp before persisting
 */
export declare class Money {
    private readonly _amount;
    private readonly _currency;
    private constructor();
    static of(amount: string | Decimal, currency: CurrencyCode): Money;
    static zero(currency: CurrencyCode): Money;
    static fromDTO(dto: MoneyDTO): Money;
    get amount(): Decimal;
    get currency(): CurrencyCode;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(factor: string | number | Decimal): Money;
    abs(): Money;
    negate(): Money;
    roundTo4dp(): Money;
    isZero(): boolean;
    isPositive(): boolean;
    isNegative(): boolean;
    equals(other: Money): boolean;
    compareTo(other: Money): -1 | 0 | 1;
    toDTO(): MoneyDTO;
    /** Serialises as a plain object with string amount — NEVER a JS number. */
    toJSON(): {
        amount: string;
        currency: CurrencyCode;
    };
    toString(): string;
    private assertSameCurrency;
}
//# sourceMappingURL=money.d.ts.map