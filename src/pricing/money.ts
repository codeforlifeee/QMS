/**
 * Money primitives.
 *
 * Two rules make the whole pricing engine trustworthy:
 *
 *  1. **No floats, ever.** Amounts are integer *minor units* (paise, fils) held in
 *     `bigint`. Intermediates are integer *micros* — minor units x 1e6 — so a chain of
 *     multiplications never accumulates rounding error. Rounding happens only where the
 *     engine explicitly asks for it.
 *  2. **Currency is part of the value.** Adding AED to INR throws. This is the single
 *     defect that produced "AED Rs 12,500.00" in the previous implementation, where a
 *     INR 295 visa fee was summed into an AED subtotal.
 *
 * Display formatting goes through `Intl.NumberFormat`. Concatenating a symbol onto a
 * number is banned — that is the other half of the same old bug.
 */

export type CurrencyCode = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';

interface CurrencyDef {
  /** minor units per major unit, as a power of ten. 2 => 100 paise in a rupee. */
  readonly exponent: number;
  readonly locale: string;
}

export const CURRENCIES: Readonly<Record<CurrencyCode, CurrencyDef>> = {
  INR: { exponent: 2, locale: 'en-IN' },
  AED: { exponent: 2, locale: 'en-AE' },
  USD: { exponent: 2, locale: 'en-US' },
  EUR: { exponent: 2, locale: 'en-IE' },
  GBP: { exponent: 2, locale: 'en-GB' },
};

/** Micros per minor unit. The working precision for all intermediate arithmetic. */
export const MICRO = 1_000_000n;
/** FX rates are integers scaled by this (8 decimal places). */
export const RATE = 100_000_000n;
/** Percentages are a *fraction* scaled by this (6 dp). 18% -> 180_000n. */
export const PCT = 1_000_000n;

/** An amount in minor units x 1e6. Never round these except at a defined rounding point. */
export type Micros = bigint;
/** An FX rate x 1e8. */
export type RateQ = bigint;
/** A fraction x 1e6. 18% is 180_000n, not 18n. */
export type PctQ = bigint;

export interface Money {
  readonly minor: bigint;
  readonly ccy: CurrencyCode;
}

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Cannot combine ${a} with ${b} — convert to a single currency first`);
    this.name = 'CurrencyMismatchError';
  }
}

export function assertSameCurrency(a: CurrencyCode, b: CurrencyCode): void {
  if (a !== b) throw new CurrencyMismatchError(a, b);
}

/* ------------------------------------------------------------------ *
 * Exact decimal parsing
 * ------------------------------------------------------------------ */

const DECIMAL = /^(-)?(\d*)(?:\.(\d*))?$/;

function plainString(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`Not a finite number: ${n}`);
  const s = String(n);
  if (s.includes('e') || s.includes('E')) {
    throw new Error(`Exponential notation is ambiguous for money: ${s} — pass a string`);
  }
  return s;
}

/**
 * Parses a decimal string to an integer scaled by 10^scaleDigits, rounding HALF_UP if
 * more precision was supplied than the scale allows. String input is exact; numbers are
 * accepted for convenience but go through their decimal representation.
 */
export function scaleDecimal(input: string | number, scaleDigits: number): bigint {
  const s = typeof input === 'number' ? plainString(input) : input.trim();
  const m = DECIMAL.exec(s);
  if (!m) throw new Error(`Not a valid decimal: "${s}"`);
  const whole = m[2] ?? '';
  const frac = m[3] ?? '';
  if (whole === '' && frac === '') throw new Error(`Not a valid decimal: "${s}"`);

  const kept = frac.slice(0, scaleDigits).padEnd(scaleDigits, '0');
  let value = BigInt((whole === '' ? '0' : whole) + kept);
  // round half up on the first dropped digit
  if (frac.length > scaleDigits) {
    const nextDigit = frac.charCodeAt(scaleDigits) - 48;
    if (nextDigit >= 5) value += 1n;
  }
  return m[1] === '-' ? -value : value;
}

/* ------------------------------------------------------------------ *
 * Division and rounding
 * ------------------------------------------------------------------ */

/**
 * Integer division rounding HALF_UP *away from zero* — the commercial convention used
 * in Indian invoicing. `bigint` division truncates toward zero, which would bias every
 * total slightly downward, so this is used for every quotient in the engine.
 */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('Division by zero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const r = n % d;
  const rounded = r * 2n >= d ? q + 1n : q;
  return negative ? -rounded : rounded;
}

/** Micros -> minor units. One of the engine's four rounding points. */
export const roundMicros = (mu: Micros): bigint => divRoundHalfUp(mu, MICRO);

/**
 * Rounds to a multiple of `unit` minor units — e.g. unit=100n rounds INR to the nearest
 * rupee, unit=10_000n to the nearest INR 100.
 */
export function roundToUnit(minor: bigint, unit: bigint): bigint {
  if (unit <= 1n) return minor;
  return divRoundHalfUp(minor, unit) * unit;
}

/* ------------------------------------------------------------------ *
 * Constructors
 * ------------------------------------------------------------------ */

export function money(minor: bigint | number, ccy: CurrencyCode): Money {
  if (typeof minor === 'number' && !Number.isInteger(minor)) {
    throw new Error(`money() takes whole minor units, got ${minor} — use parseMajor() for decimals`);
  }
  return { minor: BigInt(minor), ccy };
}

export const zero = (ccy: CurrencyCode): Money => ({ minor: 0n, ccy });

/** `parseMajor('1234.56', 'INR')` -> 123456 paise. */
export function parseMajor(input: string | number, ccy: CurrencyCode): Money {
  return { minor: scaleDecimal(input, CURRENCIES[ccy].exponent), ccy };
}

/** `pctFromPercent(18)` -> 180_000n (i.e. the fraction 0.18). */
export const pctFromPercent = (percent: string | number): PctQ =>
  divRoundHalfUp(scaleDecimal(percent, 8), 10_000n);

/** `pctFromFraction(0.18)` -> 180_000n. */
export const pctFromFraction = (fraction: string | number): PctQ => scaleDecimal(fraction, 6);

/** `rateFromDecimal('22.85')` -> 2_285_000_000n (AED->INR at 22.85). */
export const rateFromDecimal = (rate: string | number): RateQ => scaleDecimal(rate, 8);

export const IDENTITY_RATE: RateQ = RATE;

/* ------------------------------------------------------------------ *
 * Arithmetic
 * ------------------------------------------------------------------ */

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a.ccy, b.ccy);
  return { minor: a.minor + b.minor, ccy: a.ccy };
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a.ccy, b.ccy);
  return { minor: a.minor - b.minor, ccy: a.ccy };
}

export const negMoney = (a: Money): Money => ({ minor: -a.minor, ccy: a.ccy });

export function sumMoney(items: readonly Money[], ccy: CurrencyCode): Money {
  let total = 0n;
  for (const m of items) {
    assertSameCurrency(ccy, m.ccy);
    total += m.minor;
  }
  return { minor: total, ccy };
}

export function cmpMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a.ccy, b.ccy);
  return a.minor < b.minor ? -1 : a.minor > b.minor ? 1 : 0;
}

export const isZero = (m: Money): boolean => m.minor === 0n;
export const isNegative = (m: Money): boolean => m.minor < 0n;

export const toMicros = (m: Money): Micros => m.minor * MICRO;
export const fromMicros = (mu: Micros, ccy: CurrencyCode): Money => ({ minor: roundMicros(mu), ccy });

/* ------------------------------------------------------------------ *
 * Micro-domain operations (no rounding to minor units here)
 * ------------------------------------------------------------------ */

/** cost x (1 + pct). The markup step. */
export const applyMarkup = (mu: Micros, pct: PctQ): Micros => divRoundHalfUp(mu * (PCT + pct), PCT);

/** The pct portion *of* an amount — used for tax and percentage discounts. */
export const pctOf = (mu: Micros, pct: PctQ): Micros => divRoundHalfUp(mu * pct, PCT);

/** Extracts embedded tax from a tax-inclusive amount: base x r/(1+r). */
export const pctOfInclusive = (mu: Micros, pct: PctQ): Micros =>
  divRoundHalfUp(mu * pct, PCT + pct);

/** Converts micros from one currency to another using a frozen rate. */
export const convertMicros = (mu: Micros, rate: RateQ): Micros => divRoundHalfUp(mu * rate, RATE);

/** Applies an FX spread on top of a rate, kept separate so reconciliation stays possible. */
export const withSpread = (rate: RateQ, spread: PctQ): RateQ =>
  divRoundHalfUp(rate * (PCT + spread), PCT);

export const scaleMicros = (mu: Micros, factor: bigint): Micros => mu * factor;

/* ------------------------------------------------------------------ *
 * Allocation
 * ------------------------------------------------------------------ */

/**
 * Splits an amount into `parts` pieces that sum *exactly* back to it (largest-remainder).
 *
 * This is how the per-person figure is produced. Dividing a total by head count and
 * displaying the quotient is what makes "per person x pax != total" appear on documents;
 * allocating instead makes the discrepancy structurally impossible.
 */
export function allocate(total: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`allocate() needs a positive whole number of parts, got ${parts}`);
  }
  const n = BigInt(parts);
  const negative = total.minor < 0n;
  const abs = negative ? -total.minor : total.minor;
  const base = abs / n;
  const remainder = abs - base * n;

  const out: Money[] = [];
  for (let i = 0n; i < n; i += 1n) {
    const v = base + (i < remainder ? 1n : 0n);
    out.push({ minor: negative ? -v : v, ccy: total.ccy });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Display
 * ------------------------------------------------------------------ */

/** Exact decimal string, no symbol, no locale grouping. Safe for any magnitude. */
export function toMajorString(m: Money): string {
  const exp = CURRENCIES[m.ccy].exponent;
  const negative = m.minor < 0n;
  const digits = (negative ? -m.minor : m.minor).toString().padStart(exp + 1, '0');
  const whole = digits.slice(0, digits.length - exp);
  const frac = exp > 0 ? `.${digits.slice(digits.length - exp)}` : '';
  return `${negative ? '-' : ''}${whole}${frac}`;
}

/**
 * Locale-correct currency string. The ONLY sanctioned way to render money in the UI or
 * the PDF — never concatenate a symbol onto a formatted number.
 */
export function formatMoney(
  m: Money,
  opts: { readonly showDecimals?: boolean; readonly locale?: string } = {},
): string {
  if (m.minor > BigInt(Number.MAX_SAFE_INTEGER) || m.minor < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Amount too large to format safely: ${toMajorString(m)} ${m.ccy}`);
  }
  const def = CURRENCIES[m.ccy];
  const major = Number(m.minor) / 10 ** def.exponent;
  const decimals = opts.showDecimals === false ? 0 : def.exponent;
  return new Intl.NumberFormat(opts.locale ?? def.locale, {
    style: 'currency',
    currency: m.ccy,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/** Renders a PctQ back to a human percentage, e.g. 180_000n -> "18%". */
export function formatPct(pct: PctQ): string {
  const scaled = divRoundHalfUp(pct * 10_000n, PCT); // -> percent x 100
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const body = frac === 0n ? `${whole}` : `${whole}.${frac.toString().padStart(2, '0').replace(/0$/, '')}`;
  return `${negative ? '-' : ''}${body}%`;
}
