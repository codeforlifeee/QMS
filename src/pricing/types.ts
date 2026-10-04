import type { CurrencyCode, Money, PctQ, RateQ } from './money.js';

export type LineType = 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'FLIGHT' | 'VISA' | 'MEAL' | 'MISC';

/** How the agent wants margin applied to this quotation. Chosen per quotation. */
export type PricingMode = 'PER_SERVICE' | 'FLAT' | 'TARGET_MARGIN';

/** How a line's cost is derived from its rate. */
export type PricingBasis =
  | 'PER_PERSON'
  | 'PER_ROOM_NIGHT'
  | 'PER_ROOM'
  | 'PER_UNIT'
  | 'PER_GROUP';

/** How a child or infant is charged relative to an adult. Never hardcode 0.5. */
export type TierMode = 'MULTIPLIER' | 'ABSOLUTE' | 'SAME_AS_ADULT' | 'FREE';

export type Occupancy = 'SINGLE' | 'TWIN' | 'DOUBLE' | 'TRIPLE' | 'QUAD';

export interface Pax {
  readonly adults: number;
  readonly children: number;
  readonly infants: number;
}

/**
 * An explicit room booking. Rooms are never inferred by dividing pax by two — the agent
 * states what was actually booked, so odd group sizes and single supplements are exact.
 */
export interface RoomAllocation {
  readonly occupancy: Occupancy;
  readonly roomCount: number;
  /** Rate for one room for one night, in the line's cost currency. */
  readonly roomRateMinor: bigint;
  readonly singleSupplementMinor?: bigint;
  readonly extraBedCount?: number;
  readonly extraBedRateMinor?: bigint;
  readonly childNoBedCount?: number;
  readonly childNoBedRateMinor?: bigint;
  /** Max heads the room sleeps; used only to raise a capacity warning. */
  readonly capacity?: number;
  readonly paxInRoom?: number;
}

export interface TierPricing {
  readonly mode: TierMode;
  /** For MULTIPLIER: a fraction of the adult rate (0.5 -> pctFromFraction(0.5)). */
  readonly multiplier?: PctQ;
  /** For ABSOLUTE: a flat rate in the line's cost currency. */
  readonly rateMinor?: bigint;
}

export interface LineItem {
  readonly id: string;
  readonly dayId?: string | null;
  readonly type: LineType;
  readonly label: string;
  readonly basis: PricingBasis;

  /**
   * The supplier's own currency, frozen when the line was added. Keeping it per line is
   * what makes an AED tour and an INR visa fee coexist without corrupting the subtotal.
   */
  readonly costCurrency: CurrencyCode;
  /** Adult (or unit / group) rate in `costCurrency` minor units. */
  readonly adultRateMinor: bigint;

  readonly child?: TierPricing;
  readonly infant?: TierPricing;

  /** PER_UNIT */
  readonly qty?: number;
  /** PER_ROOM_NIGHT */
  readonly nights?: number;
  readonly rooms?: readonly RoomAllocation[];

  /** Overrides the default markup for this line's type. */
  readonly markupPctOverride?: PctQ;
  /** Pass-through at cost — typically flights. Excluded from FLAT and solver modes. */
  readonly markupLocked?: boolean;
  /** Shown on the document but excluded from every total. */
  readonly isOptional?: boolean;

  /** Key into `taxRatesByClass`. Different classes carry different rates and bases. */
  readonly taxClass?: string;
}

export type Discount =
  | { readonly kind: 'PERCENT'; readonly pct: PctQ; readonly label: string }
  | { readonly kind: 'ABS'; readonly amountMinor: bigint; readonly label: string }
  | { readonly kind: 'PER_PERSON'; readonly amountMinor: bigint; readonly label: string };

export interface QuotationInput {
  readonly quoteCurrency: CurrencyCode;
  readonly pax: Pax;

  readonly pricingMode: PricingMode;
  /** Used by PER_SERVICE. */
  readonly defaultMarkupByType?: Partial<Record<LineType, PctQ>>;
  /** Used by FLAT. */
  readonly flatMarkupPct?: PctQ;

  /**
   * Frozen FX: cost currency -> quote currency. A missing rate is a hard error, never a
   * silent 1:1, because that would quietly understate an AED cost by ~23x.
   */
  readonly fx: Partial<Record<CurrencyCode, RateQ>>;

  readonly discounts?: readonly Discount[];
  readonly taxRatesByClass?: Readonly<Record<string, PctQ>>;
  /** Default tax class for lines that do not name one. */
  readonly defaultTaxClass?: string;

  /** Round the grand total to a multiple of this many minor units. 1n = no rounding. */
  readonly roundingUnit?: bigint;

  /** Do infants count as heads for the per-person figure? Usually not. */
  readonly infantsCountInPerPerson?: boolean;

  readonly lines: readonly LineItem[];
}

export interface LineResult {
  readonly lineId: string;
  readonly label: string;
  readonly type: LineType;
  readonly dayId: string | null;
  readonly isOptional: boolean;
  /** Supplier cost in its original currency — what you reconcile against their invoice. */
  readonly costOriginal: Money;
  readonly cost: Money;
  readonly sell: Money;
  readonly margin: Money;
  readonly appliedMarkupPct: PctQ;
  readonly taxClass: string;
}

export interface DayResult {
  readonly dayId: string | null;
  readonly cost: Money;
  readonly sell: Money;
  readonly margin: Money;
  readonly lineIds: readonly string[];
}

export interface QuoteResult {
  readonly currency: CurrencyCode;
  readonly lines: readonly LineResult[];
  readonly days: readonly DayResult[];

  readonly totalCost: Money;
  readonly subtotalSell: Money;
  readonly discountTotal: Money;
  readonly net: Money;
  readonly taxByClass: Readonly<Record<string, Money>>;
  readonly taxTotal: Money;
  readonly roundingAdjustment: Money;
  readonly grandTotal: Money;

  /** net - cost. Tax is never margin. */
  readonly margin: Money;
  /** margin / net — margin on the selling price. */
  readonly marginPct: PctQ;
  /** margin / cost — markup on cost. A different number; labelling matters. */
  readonly markupPct: PctQ;

  readonly chargeablePax: number;
  /** Allocation that sums exactly to grandTotal. Empty when chargeablePax is 0. */
  readonly perPersonAllocation: readonly Money[];
  /** Representative per-head figure, or null when there are no chargeable heads. */
  readonly perPerson: Money | null;

  readonly warnings: readonly string[];
}
