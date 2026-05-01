import { describe, it, expect } from 'vitest';
import { HealthController } from '../src/health/health.controller';
import { Money, MoneySchema } from '@klariq/shared';

/**
 * Smoke tests — prove that:
 *  1. The HealthController returns a valid response (no external deps needed)
 *  2. The Money value object works correctly
 *  3. MoneySchema rejects JS numbers at the boundary
 *
 * Integration tests (requiring a real Postgres + Redis) live in
 * test/integration/ and are run separately with `pnpm test:integration`.
 */

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns status ok', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
  });

  it('returns a valid ISO timestamp', () => {
    const result = controller.check();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});

describe('Money value object', () => {
  it('adds two CAD amounts correctly', () => {
    const a = Money.of('100.0000', 'CAD');
    const b = Money.of('50.2500', 'CAD');
    expect(a.add(b).toString()).toBe('150.2500 CAD');
  });

  it('throws when adding different currencies', () => {
    const cad = Money.of('100.00', 'CAD');
    const usd = Money.of('100.00', 'USD');
    expect(() => cad.add(usd)).toThrow('Currency mismatch');
  });

  it('toJSON never returns a number', () => {
    const m = Money.of('42.5', 'CAD');
    const json = m.toJSON();
    expect(typeof json.amount).toBe('string');
    expect(json.amount).toBe('42.5000');
  });

  it('negates correctly', () => {
    const m = Money.of('100.00', 'CAD');
    expect(m.negate().toString()).toBe('-100.0000 CAD');
  });
});

describe('MoneySchema boundary validation', () => {
  it('accepts a valid string decimal', () => {
    const result = MoneySchema.safeParse({ amount: '100.0000', currency: 'CAD' });
    expect(result.success).toBe(true);
  });

  it('rejects a JS number — money must be a string at boundaries', () => {
    const result = MoneySchema.safeParse({ amount: 100, currency: 'CAD' });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    const result = MoneySchema.safeParse({ amount: '100.00', currency: 'XYZ' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 decimal places', () => {
    const result = MoneySchema.safeParse({ amount: '100.00001', currency: 'CAD' });
    expect(result.success).toBe(false);
  });
});
