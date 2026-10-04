import { parseMajor, pctFromFraction, pctFromPercent, rateFromDecimal } from '../pricing/money.js';
import type { CurrencyCode } from '../pricing/money.js';
import type {
  Discount,
  LineItem,
  LineType,
  PricingBasis,
  PricingMode,
  QuotationInput,
  RoomAllocation,
  TierMode,
} from '../pricing/types.js';

/**
 * The persisted shape.
 *
 * Money is stored as a decimal *string* ("250.00") and percentages as plain numbers (18
 * meaning 18%), so the JSON on disk stays human-readable and hand-editable. Conversion
 * into the engine's exact bigint types happens in one place — `toEngineInput` below — so
 * there is exactly one boundary where a unit mistake could occur, and it is tested.
 *
 * These interfaces are also the future Postgres table shapes; moving to Supabase later
 * means swapping the repository, not rewriting the model.
 */

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'expired' | 'void';

export interface StoredTier {
  readonly mode: TierMode;
  /** For MULTIPLIER — a fraction of the adult rate, e.g. 0.5 */
  readonly multiplier?: number;
  /** For ABSOLUTE — a decimal string in the line's cost currency */
  readonly rate?: string;
}

export interface StoredRoom {
  readonly occupancy: RoomAllocation['occupancy'];
  readonly roomCount: number;
  readonly roomRate: string;
  readonly singleSupplement?: string;
  readonly extraBedCount?: number;
  readonly extraBedRate?: string;
  readonly childNoBedCount?: number;
  readonly childNoBedRate?: string;
  readonly capacity?: number;
  readonly paxInRoom?: number;
}

export interface StoredLine {
  readonly id: string;
  readonly dayId?: string | null;
  readonly type: LineType;
  readonly label: string;
  readonly description?: string;
  readonly basis: PricingBasis;
  readonly costCurrency: CurrencyCode;
  /** Adult / unit / group rate, decimal string in `costCurrency`. */
  readonly adultRate: string;
  readonly child?: StoredTier;
  readonly infant?: StoredTier;
  readonly qty?: number;
  readonly nights?: number;
  readonly rooms?: readonly StoredRoom[];
  /** Percentage, e.g. 18 */
  readonly markupPctOverride?: number;
  readonly markupLocked?: boolean;
  readonly isOptional?: boolean;
  readonly taxClass?: string;
  /**
   * Catalog product this line was picked from — traceability only. The cost on the
   * line is always the snapshot in `adultRate` + `costCurrency` (PRD §5 copy-on-add).
   * Editing a catalog row never retroactively changes a quotation.
   */
  readonly catalogRef?: string;
  /** Supplier name, frozen when the line was added. */
  readonly supplier?: string;
}

export interface StoredDay {
  readonly id: string;
  readonly index: number;
  readonly title: string;
  /** Prose shown under the day heading. This is the slot AI drafts into. */
  readonly prose?: string;
  readonly imageUrl?: string;
}

export type StoredDiscount =
  | { readonly kind: 'PERCENT'; readonly pct: number; readonly label: string }
  | { readonly kind: 'ABS'; readonly amount: string; readonly label: string }
  | { readonly kind: 'PER_PERSON'; readonly amount: string; readonly label: string };

export interface StoredQuotation {
  readonly id: string;
  /** Unguessable slug for the share URL. No dots. */
  readonly token: string;
  readonly status: QuotationStatus;
  readonly reference: string;

  readonly title: string;
  readonly destination: string;
  readonly heroImageUrl?: string;

  readonly client: {
    readonly name: string;
    readonly phone?: string;
    readonly email?: string;
  };
  readonly agentName?: string;

  readonly travelStart: string; // YYYY-MM-DD
  readonly travelEnd: string;

  readonly pax: { readonly adults: number; readonly children: number; readonly infants: number };
  readonly infantsCountInPerPerson?: boolean;

  readonly quoteCurrency: CurrencyCode;
  /** Frozen FX, cost currency -> quote currency, as decimal strings. */
  readonly fx: Partial<Record<CurrencyCode, string>>;

  readonly pricingMode: PricingMode;
  /** Percentages, e.g. { ACTIVITY: 18 } */
  readonly defaultMarkupByType?: Partial<Record<LineType, number>>;
  readonly flatMarkupPct?: number;

  readonly discounts?: readonly StoredDiscount[];
  /** Percentages, e.g. { standard: 5 } */
  readonly taxRatesByClass?: Readonly<Record<string, number>>;
  readonly defaultTaxClass?: string;
  readonly taxLabel?: string;
  /** Minor units, e.g. 100 rounds INR to the nearest rupee. */
  readonly roundingUnit?: number;

  readonly days: readonly StoredDay[];
  readonly lines: readonly StoredLine[];

  readonly overview?: string;
  readonly inclusions?: readonly string[];
  readonly exclusions?: readonly string[];
  readonly paymentPolicy?: readonly string[];
  readonly terms?: readonly string[];

  readonly validUntil?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sentAt?: string;
  readonly viewCount?: number;
  readonly firstViewedAt?: string;
}

/* ------------------------------------------------------------------ *
 * Mapping into the pricing engine — the single unit boundary
 * ------------------------------------------------------------------ */

/** ABSOLUTE tier rates are in the line's cost currency, so they need its exponent. */
function toTierIn(t: StoredTier | undefined, ccy: CurrencyCode) {
  if (!t) return undefined;
  return {
    mode: t.mode,
    ...(t.multiplier !== undefined ? { multiplier: pctFromFraction(t.multiplier) } : {}),
    ...(t.rate !== undefined ? { rateMinor: parseMajor(t.rate, ccy).minor } : {}),
  };
}

function toRoom(r: StoredRoom, ccy: CurrencyCode): RoomAllocation {
  return {
    occupancy: r.occupancy,
    roomCount: r.roomCount,
    roomRateMinor: parseMajor(r.roomRate, ccy).minor,
    ...(r.singleSupplement !== undefined
      ? { singleSupplementMinor: parseMajor(r.singleSupplement, ccy).minor }
      : {}),
    ...(r.extraBedCount !== undefined ? { extraBedCount: r.extraBedCount } : {}),
    ...(r.extraBedRate !== undefined
      ? { extraBedRateMinor: parseMajor(r.extraBedRate, ccy).minor }
      : {}),
    ...(r.childNoBedCount !== undefined ? { childNoBedCount: r.childNoBedCount } : {}),
    ...(r.childNoBedRate !== undefined
      ? { childNoBedRateMinor: parseMajor(r.childNoBedRate, ccy).minor }
      : {}),
    ...(r.capacity !== undefined ? { capacity: r.capacity } : {}),
    ...(r.paxInRoom !== undefined ? { paxInRoom: r.paxInRoom } : {}),
  };
}

function toLine(l: StoredLine): LineItem {
  const ccy = l.costCurrency;
  const child = toTierIn(l.child, ccy);
  const infant = toTierIn(l.infant, ccy);
  return {
    id: l.id,
    dayId: l.dayId ?? null,
    type: l.type,
    label: l.label,
    basis: l.basis,
    costCurrency: ccy,
    adultRateMinor: parseMajor(l.adultRate, ccy).minor,
    ...(child ? { child } : {}),
    ...(infant ? { infant } : {}),
    ...(l.qty !== undefined ? { qty: l.qty } : {}),
    ...(l.nights !== undefined ? { nights: l.nights } : {}),
    ...(l.rooms ? { rooms: l.rooms.map((r) => toRoom(r, ccy)) } : {}),
    ...(l.markupPctOverride !== undefined
      ? { markupPctOverride: pctFromPercent(l.markupPctOverride) }
      : {}),
    ...(l.markupLocked !== undefined ? { markupLocked: l.markupLocked } : {}),
    ...(l.isOptional !== undefined ? { isOptional: l.isOptional } : {}),
    ...(l.taxClass !== undefined ? { taxClass: l.taxClass } : {}),
  };
}

function toDiscount(d: StoredDiscount, ccy: CurrencyCode): Discount {
  if (d.kind === 'PERCENT') return { kind: 'PERCENT', pct: pctFromPercent(d.pct), label: d.label };
  return { kind: d.kind, amountMinor: parseMajor(d.amount, ccy).minor, label: d.label };
}

export function toEngineInput(q: StoredQuotation): QuotationInput {
  const fx: Partial<Record<CurrencyCode, ReturnType<typeof rateFromDecimal>>> = {};
  for (const [code, rate] of Object.entries(q.fx)) {
    if (rate !== undefined) fx[code as CurrencyCode] = rateFromDecimal(rate);
  }

  const defaultMarkupByType: Partial<Record<LineType, ReturnType<typeof pctFromPercent>>> = {};
  for (const [type, pct] of Object.entries(q.defaultMarkupByType ?? {})) {
    if (pct !== undefined) defaultMarkupByType[type as LineType] = pctFromPercent(pct);
  }

  const taxRatesByClass: Record<string, ReturnType<typeof pctFromPercent>> = {};
  for (const [cls, pct] of Object.entries(q.taxRatesByClass ?? {})) {
    taxRatesByClass[cls] = pctFromPercent(pct);
  }

  return {
    quoteCurrency: q.quoteCurrency,
    pax: q.pax,
    pricingMode: q.pricingMode,
    defaultMarkupByType,
    ...(q.flatMarkupPct !== undefined ? { flatMarkupPct: pctFromPercent(q.flatMarkupPct) } : {}),
    fx,
    discounts: (q.discounts ?? []).map((d) => toDiscount(d, q.quoteCurrency)),
    taxRatesByClass,
    ...(q.defaultTaxClass !== undefined ? { defaultTaxClass: q.defaultTaxClass } : {}),
    ...(q.roundingUnit !== undefined ? { roundingUnit: BigInt(q.roundingUnit) } : {}),
    ...(q.infantsCountInPerPerson !== undefined
      ? { infantsCountInPerPerson: q.infantsCountInPerPerson }
      : {}),
    lines: q.lines.map(toLine),
  };
}

/* ------------------------------------------------------------------ *
 * Derived helpers
 * ------------------------------------------------------------------ */

export function tripDuration(q: StoredQuotation): { days: number; nights: number } {
  const start = new Date(`${q.travelStart}T00:00:00Z`).getTime();
  const end = new Date(`${q.travelEnd}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return { days: 0, nights: 0 };
  const nights = Math.round((end - start) / 86_400_000);
  return { days: nights + 1, nights };
}

export function paxSummary(q: StoredQuotation): string {
  const bits = [`${q.pax.adults} Adult${q.pax.adults === 1 ? '' : 's'}`];
  if (q.pax.children > 0) bits.push(`${q.pax.children} Child${q.pax.children === 1 ? '' : 'ren'}`);
  if (q.pax.infants > 0) bits.push(`${q.pax.infants} Infant${q.pax.infants === 1 ? '' : 's'}`);
  return bits.join(', ');
}

