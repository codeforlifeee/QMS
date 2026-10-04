import { describe, it, expect } from 'vitest';
import {
  CurrencyMismatchError,
  addMoney,
  allocate,
  applyMarkup,
  convertMicros,
  divRoundHalfUp,
  formatMoney,
  formatPct,
  fromMicros,
  money,
  parseMajor,
  pctFromFraction,
  pctFromPercent,
  pctOf,
  pctOfInclusive,
  rateFromDecimal,
  roundToUnit,
  subMoney,
  sumMoney,
  toMajorString,
  toMicros,
  withSpread,
} from './money.js';

describe('currency safety', () => {
  it('refuses to add different currencies — the INR-visa-into-AED-subtotal bug', () => {
    const aedSubtotal = parseMajor('4200.00', 'AED');
    const inrVisaFee = parseMajor('295.00', 'INR');
    expect(() => addMoney(aedSubtotal, inrVisaFee)).toThrow(CurrencyMismatchError);
  });

  it('refuses to sum a mixed list', () => {
    expect(() => sumMoney([parseMajor('10', 'AED'), parseMajor('10', 'INR')], 'AED')).toThrow(
      CurrencyMismatchError,
    );
  });

  it('never renders one currency with another currency symbol', () => {
    const aed = parseMajor('12500.00', 'AED');
    const formatted = formatMoney(aed);
    expect(formatted).not.toContain('₹'); // the old output was "AED Rs 12,500.00"
    expect(formatted).toContain('12,500');
  });

  it('formats INR with the rupee symbol', () => {
    expect(formatMoney(parseMajor('12500', 'INR'))).toContain('₹');
  });
});

describe('exact decimal parsing', () => {
  it('parses to whole minor units', () => {
    expect(parseMajor('1234.56', 'INR').minor).toBe(123456n);
    expect(parseMajor('0.01', 'INR').minor).toBe(1n);
    expect(parseMajor('100', 'AED').minor).toBe(10000n);
    expect(parseMajor('-45.5', 'INR').minor).toBe(-4550n);
  });

  it('is immune to binary floating point', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE754; in minor units it is exact.
    const sum = addMoney(parseMajor('0.1', 'INR'), parseMajor('0.2', 'INR'));
    expect(sum.minor).toBe(30n);
    expect(toMajorString(sum)).toBe('0.30');
  });

  it('rounds HALF_UP when given more precision than the currency has', () => {
    expect(parseMajor('1.005', 'INR').minor).toBe(101n);
    expect(parseMajor('1.004', 'INR').minor).toBe(100n);
    expect(parseMajor('-1.005', 'INR').minor).toBe(-101n);
  });

  it('rejects nonsense and exponential notation', () => {
    expect(() => parseMajor('abc', 'INR')).toThrow();
    expect(() => parseMajor('', 'INR')).toThrow();
    expect(() => parseMajor(1e21, 'INR')).toThrow(/Exponential/);
    expect(() => money(12.5, 'INR')).toThrow(/whole minor units/);
  });

  it('round-trips through toMajorString', () => {
    for (const v of ['0.00', '0.07', '12.34', '1000000.99', '-7.50']) {
      expect(toMajorString(parseMajor(v, 'INR'))).toBe(v);
    }
  });
});

describe('rounding', () => {
  it('rounds half away from zero, not toward it', () => {
    expect(divRoundHalfUp(5n, 10n)).toBe(1n); // 0.5 -> 1
    expect(divRoundHalfUp(4n, 10n)).toBe(0n);
    expect(divRoundHalfUp(15n, 10n)).toBe(2n); // 1.5 -> 2
    expect(divRoundHalfUp(-5n, 10n)).toBe(-1n); // -0.5 -> -1
    expect(divRoundHalfUp(-15n, 10n)).toBe(-2n);
  });

  it('never silently truncates (bigint division would bias totals downward)', () => {
    expect(9n / 10n).toBe(0n); // plain bigint
    expect(divRoundHalfUp(9n, 10n)).toBe(1n); // ours
  });

  it('throws on division by zero rather than producing Infinity', () => {
    expect(() => divRoundHalfUp(1n, 0n)).toThrow(/zero/);
  });

  it('rounds to a unit', () => {
    expect(roundToUnit(12_345n, 100n)).toBe(12_300n); // nearest rupee
    expect(roundToUnit(12_350n, 100n)).toBe(12_400n); // .50 rounds up
    expect(roundToUnit(1_234_567n, 10_000n)).toBe(1_230_000n); // nearest INR 100
    expect(roundToUnit(999n, 1n)).toBe(999n); // unit 1 is a no-op
  });
});

describe('percentages and rates', () => {
  it('converts percent and fraction to the same internal scale', () => {
    expect(pctFromPercent(18)).toBe(180_000n);
    expect(pctFromFraction(0.18)).toBe(180_000n);
    expect(pctFromPercent('18.5')).toBe(185_000n);
    expect(pctFromPercent(5)).toBe(50_000n);
  });

  it('formats back to a readable percentage', () => {
    expect(formatPct(pctFromPercent(18))).toBe('18%');
    expect(formatPct(pctFromPercent('18.5'))).toBe('18.5%');
  });

  it('applies markup as cost x (1 + pct)', () => {
    const cost = toMicros(parseMajor('1000.00', 'AED'));
    const sell = applyMarkup(cost, pctFromPercent(18));
    expect(fromMicros(sell, 'AED').minor).toBe(118_000n); // AED 1,180.00
  });

  it('takes a percentage of an amount', () => {
    const base = toMicros(parseMajor('1000.00', 'INR'));
    expect(fromMicros(pctOf(base, pctFromPercent(5)), 'INR').minor).toBe(5_000n); // INR 50.00
  });

  it('extracts tax from a tax-inclusive amount', () => {
    // INR 1,050 inclusive of 5% contains INR 50 of tax.
    const inclusive = toMicros(parseMajor('1050.00', 'INR'));
    expect(fromMicros(pctOfInclusive(inclusive, pctFromPercent(5)), 'INR').minor).toBe(5_000n);
  });

  it('converts currency at a frozen rate', () => {
    const aed = toMicros(parseMajor('100.00', 'AED'));
    const inr = convertMicros(aed, rateFromDecimal('22.85'));
    expect(fromMicros(inr, 'INR').minor).toBe(228_500n); // INR 2,285.00
  });

  it('keeps the FX spread separate from the rate so cost stays reconcilable', () => {
    const base = rateFromDecimal('22.00');
    const padded = withSpread(base, pctFromPercent(2));
    expect(padded).toBe(rateFromDecimal('22.44'));
  });
});

describe('per-person allocation', () => {
  it('always sums back to the total — "per person x pax != total" is impossible', () => {
    // INR 100.00 across 3 pax does not divide evenly.
    const total = parseMajor('100.00', 'INR');
    const parts = allocate(total, 3);
    expect(parts.map((p) => p.minor)).toEqual([3334n, 3333n, 3333n]);
    expect(sumMoney(parts, 'INR').minor).toBe(total.minor);
  });

  it('holds for many awkward splits', () => {
    for (const amount of [1n, 7n, 99n, 100_001n, 123_457n]) {
      for (const pax of [1, 2, 3, 5, 7, 11]) {
        const total = money(amount, 'INR');
        expect(sumMoney(allocate(total, pax), 'INR').minor).toBe(amount);
      }
    }
  });

  it('allocates negative totals (a loss-making quote) without drift', () => {
    const total = money(-100n, 'INR');
    expect(sumMoney(allocate(total, 3), 'INR').minor).toBe(-100n);
  });

  it('rejects a non-positive head count rather than dividing by zero', () => {
    expect(() => allocate(parseMajor('100', 'INR'), 0)).toThrow();
    expect(() => allocate(parseMajor('100', 'INR'), -1)).toThrow();
    expect(() => allocate(parseMajor('100', 'INR'), 2.5)).toThrow();
  });
});

describe('no precision loss across a realistic chain', () => {
  it('converts, marks up, taxes and allocates without drift', () => {
    // AED 4,200 of supplier cost -> INR at 22.85, +18% markup, +5% tax, split 3 ways.
    const costAed = parseMajor('4200.00', 'AED');
    const inrMicros = convertMicros(toMicros(costAed), rateFromDecimal('22.85'));
    const sell = applyMarkup(inrMicros, pctFromPercent(18));
    const tax = pctOf(sell, pctFromPercent(5));

    const sellMoney = fromMicros(sell, 'INR');
    const taxMoney = fromMicros(tax, 'INR');
    const grand = addMoney(sellMoney, taxMoney);

    // 4200 * 22.85 = 95,970.00 ; * 1.18 = 113,244.60 ; tax 5% = 5,662.23
    expect(toMajorString(sellMoney)).toBe('113244.60');
    expect(toMajorString(taxMoney)).toBe('5662.23');
    expect(toMajorString(grand)).toBe('118906.83');

    const perPerson = allocate(grand, 3);
    expect(sumMoney(perPerson, 'INR').minor).toBe(grand.minor);
  });

  it('subtracting cost from sell yields margin exactly', () => {
    const cost = parseMajor('95970.00', 'INR');
    const sell = parseMajor('113244.60', 'INR');
    expect(toMajorString(subMoney(sell, cost))).toBe('17274.60');
  });
});
