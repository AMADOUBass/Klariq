import { describe, it, expect } from 'vitest';
import { Money, MoneySchema, SUPPORTED_CURRENCIES } from '@klariq/shared';

/**
 * Web smoke tests — verify that:
 *  1. @klariq/shared is importable in the web context
 *  2. The Money boundary contract is enforced
 *  3. All supported currencies are valid ISO 4217 codes
 */

describe('shared package imports', () => {
  it('Money.of creates a valid value object', () => {
    const m = Money.of('1234.5678', 'CAD');
    expect(m.currency).toBe('CAD');
    expect(m.toString()).toBe('1234.5678 CAD');
  });

  it('Money.zero creates a zero value', () => {
    const zero = Money.zero('CAD');
    expect(zero.isZero()).toBe(true);
  });

  it('Money arithmetic is precise (no floating point errors)', () => {
    const a = Money.of('0.1', 'CAD');
    const b = Money.of('0.2', 'CAD');
    // JavaScript: 0.1 + 0.2 = 0.30000000000000004 — Decimal.js fixes this
    expect(a.add(b).toString()).toBe('0.3000 CAD');
  });
});

describe('MoneySchema — boundary enforcement', () => {
  it('rejects JS number at API boundary', () => {
    expect(MoneySchema.safeParse({ amount: 42.5, currency: 'CAD' }).success).toBe(false);
  });

  it('accepts string decimal', () => {
    expect(MoneySchema.safeParse({ amount: '42.50', currency: 'CAD' }).success).toBe(true);
  });

  it('rejects negative amounts with wrong format', () => {
    expect(MoneySchema.safeParse({ amount: '-', currency: 'CAD' }).success).toBe(false);
  });

  it('accepts negative amounts', () => {
    expect(MoneySchema.safeParse({ amount: '-100.00', currency: 'CAD' }).success).toBe(true);
  });
});

describe('supported currencies', () => {
  it('includes CAD as the primary currency', () => {
    expect(SUPPORTED_CURRENCIES).toContain('CAD');
  });

  it('all entries are 3-character ISO 4217 codes', () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });
});
