"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = exports.MoneySchema = exports.SUPPORTED_CURRENCIES = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const zod_1 = require("zod");
// ─── Money invariant ─────────────────────────────────────────────────────────
// No monetary value crosses ANY boundary as a JS number.
// toJSON() always returns a string decimal. Zod schemas at all API boundaries
// enforce string input. The Postgres column type is NUMERIC(19,4).
// ─────────────────────────────────────────────────────────────────────────────
exports.SUPPORTED_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'];
exports.MoneySchema = zod_1.z.object({
    amount: zod_1.z
        .string()
        .regex(/^-?\d{1,15}(\.\d{1,4})?$/, 'Invalid decimal amount — use string form with up to 4 decimal places'),
    currency: zod_1.z.enum(exports.SUPPORTED_CURRENCIES),
});
decimal_js_1.default.set({ precision: 20, rounding: decimal_js_1.default.ROUND_HALF_UP });
/**
 * Immutable Money value object.
 *
 * Rules:
 *  - Constructed only via Money.of() or Money.fromDTO() — never `new Money()`
 *  - toJSON() serialises as { amount: string, currency: string } — NEVER a number
 *  - Arithmetic throws if currencies differ
 *  - Stored in Postgres as NUMERIC(19,4); always round to 4dp before persisting
 */
class Money {
    _amount;
    _currency;
    constructor(amount, currency) {
        this._amount = amount;
        this._currency = currency;
    }
    static of(amount, currency) {
        return new Money(new decimal_js_1.default(amount), currency);
    }
    static zero(currency) {
        return new Money(new decimal_js_1.default(0), currency);
    }
    static fromDTO(dto) {
        return Money.of(dto.amount, dto.currency);
    }
    get amount() {
        return this._amount;
    }
    get currency() {
        return this._currency;
    }
    add(other) {
        this.assertSameCurrency(other);
        return new Money(this._amount.plus(other._amount), this._currency);
    }
    subtract(other) {
        this.assertSameCurrency(other);
        return new Money(this._amount.minus(other._amount), this._currency);
    }
    multiply(factor) {
        return new Money(this._amount.times(new decimal_js_1.default(factor)), this._currency);
    }
    abs() {
        return new Money(this._amount.abs(), this._currency);
    }
    negate() {
        return new Money(this._amount.negated(), this._currency);
    }
    roundTo4dp() {
        return new Money(this._amount.toDecimalPlaces(4, decimal_js_1.default.ROUND_HALF_UP), this._currency);
    }
    isZero() {
        return this._amount.isZero();
    }
    isPositive() {
        return this._amount.isPositive() && !this._amount.isZero();
    }
    isNegative() {
        return this._amount.isNegative();
    }
    equals(other) {
        return this._currency === other._currency && this._amount.equals(other._amount);
    }
    compareTo(other) {
        this.assertSameCurrency(other);
        const cmp = this._amount.comparedTo(other._amount);
        return cmp < 0 ? -1 : cmp > 0 ? 1 : 0;
    }
    toDTO() {
        return {
            amount: this._amount.toFixed(4),
            currency: this._currency,
        };
    }
    /** Serialises as a plain object with string amount — NEVER a JS number. */
    toJSON() {
        return this.toDTO();
    }
    toString() {
        return `${this._amount.toFixed(4)} ${this._currency}`;
    }
    assertSameCurrency(other) {
        if (this._currency !== other._currency) {
            throw new Error(`Currency mismatch: cannot operate on ${this._currency} and ${other._currency}. ` +
                `Convert via an exchange rate first.`);
        }
    }
}
exports.Money = Money;
//# sourceMappingURL=money.js.map