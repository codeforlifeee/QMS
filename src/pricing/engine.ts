import {
  MICRO,
  PCT,
  addMoney,
  allocate,
  applyMarkup,
  convertMicros,
  divRoundHalfUp,
  fromMicros,
  money,
  pctOf,
  roundToUnit,
  subMoney,
  sumMoney,
  toMicros,
  zero,
} from './money.js';
import type { CurrencyCode, Micros, Money, PctQ } from './money.js';
import type {
  DayResult,
  LineItem,
  LineResult,
  Pax,
  QuotationInput,
  QuoteResult,
  RoomAllocation,
  TierPricing,
} from './types.js';

/**
 * The pricing pipeline.
 *
 * Ordered, deterministic, and free of I/O. The order below is load-bearing: markup is
 * applied per line, discounts come off the marked-up subtotal, and tax is charged on the
 * discounted value — because a discount reduces the agreed consideration, so GST/VAT is
 * owed on the discounted amount, not the list price.
 *
 *   1. pax context          6. discounts (after markup, before tax)
 *   2. line cost            7. tax, per class, on each class's discounted share
 *   3. FX to quote currency 8. grand total, rounded once
 *   4. markup               9. per-person allocation
 *   5. day/quote rollups
 *
 * Line costs and sells are rounded to minor units *before* being summed, so the figures
 * printed on the document add up to the printed subtotal. A client checking the maths by
 * hand must never find a discrepancy.
 */

export const ENGINE_VERSION = '1.0.0';

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

/** Resolves a child/infant rate against the adult rate, in cost-currency micros. */
function tierRateMicros(adultMicros: Micros, tier: TierPricing | undefined): Micros {
  if (!tier) return 0n;
  switch (tier.mode) {
    case 'FREE':
      return 0n;
    case 'SAME_AS_ADULT':
      return adultMicros;
    case 'ABSOLUTE':
      if (tier.rateMinor === undefined) {
        throw new PricingError('Tier mode ABSOLUTE requires rateMinor');
      }
      return tier.rateMinor * MICRO;
    case 'MULTIPLIER':
      if (tier.multiplier === undefined) {
        throw new PricingError('Tier mode MULTIPLIER requires multiplier');
      }
      return pctOf(adultMicros, tier.multiplier);
  }
}

function roomsCostMicros(rooms: readonly RoomAllocation[]): Micros {
  let total = 0n;
  for (const room of rooms) {
    const count = BigInt(room.roomCount);
    let perRoom = room.roomRateMinor;
    if (room.occupancy === 'SINGLE' && room.singleSupplementMinor !== undefined) {
      perRoom += room.singleSupplementMinor;
    }
    if (room.extraBedCount && room.extraBedRateMinor !== undefined) {
      perRoom += room.extraBedRateMinor * BigInt(room.extraBedCount);
    }
    if (room.childNoBedCount && room.childNoBedRateMinor !== undefined) {
      perRoom += room.childNoBedRateMinor * BigInt(room.childNoBedCount);
    }
    total += perRoom * count;
  }
  return total * MICRO;
}

/** Line cost in the line's OWN currency, as micros. */
function lineCostMicros(line: LineItem, pax: Pax): Micros {
  const adultMicros = line.adultRateMinor * MICRO;

  switch (line.basis) {
    case 'PER_PERSON': {
      const child = tierRateMicros(adultMicros, line.child);
      const infant = tierRateMicros(adultMicros, line.infant);
      return (
        adultMicros * BigInt(pax.adults) +
        child * BigInt(pax.children) +
        infant * BigInt(pax.infants)
      );
    }
    case 'PER_ROOM_NIGHT': {
      if (!line.rooms?.length) throw new PricingError(`Line ${line.id}: PER_ROOM_NIGHT needs rooms`);
      const nights = line.nights ?? 0;
      if (nights < 0) throw new PricingError(`Line ${line.id}: nights cannot be negative`);
      return roomsCostMicros(line.rooms) * BigInt(nights);
    }
    case 'PER_ROOM': {
      if (!line.rooms?.length) throw new PricingError(`Line ${line.id}: PER_ROOM needs rooms`);
      return roomsCostMicros(line.rooms);
    }
    case 'PER_UNIT': {
      const qty = line.qty ?? 0;
      if (qty < 0) throw new PricingError(`Line ${line.id}: qty cannot be negative`);
      return adultMicros * BigInt(qty);
    }
    case 'PER_GROUP':
      return adultMicros;
  }
}

/** The effective markup for a line, given the quotation's mode. */
function markupFor(line: LineItem, input: QuotationInput): PctQ {
  if (line.markupLocked) return 0n;
  if (input.pricingMode === 'FLAT') return input.flatMarkupPct ?? 0n;
  if (input.pricingMode === 'TARGET_MARGIN') {
    throw new PricingError(
      'TARGET_MARGIN is not implemented yet — solve for a flat rate first, then price in FLAT mode',
    );
  }
  return line.markupPctOverride ?? input.defaultMarkupByType?.[line.type] ?? 0n;
}

/**
 * Splits `total` across `weights` so the parts sum exactly to it (largest remainder).
 * Used to spread a quote-level discount across tax classes pro rata.
 */
function splitByWeight(total: Money, weights: readonly bigint[]): Money[] {
  const sum = weights.reduce((a, b) => a + b, 0n);
  if (sum === 0n) return weights.map(() => zero(total.ccy));

  const exact = weights.map((w) => (total.minor * w) / sum);
  let assigned = exact.reduce((a, b) => a + b, 0n);
  const parts = [...exact];

  // hand the remainder to the largest fractional parts, biggest weight first
  const order = weights
    .map((w, i) => ({ i, rem: total.minor * w - (exact[i] ?? 0n) * sum }))
    .sort((a, b) => (b.rem === a.rem ? 0 : b.rem > a.rem ? 1 : -1));

  let k = 0;
  const step = total.minor < 0n ? -1n : 1n;
  while (assigned !== total.minor && order.length > 0) {
    const idx = order[k % order.length]?.i ?? 0;
    parts[idx] = (parts[idx] ?? 0n) + step;
    assigned += step;
    k += 1;
  }
  return parts.map((p) => money(p, total.ccy));
}

export function priceQuotation(input: QuotationInput): QuoteResult {
  const ccy: CurrencyCode = input.quoteCurrency;
  const warnings: string[] = [];
  const defaultTaxClass = input.defaultTaxClass ?? 'standard';

  /* 1. pax context ------------------------------------------------------ */
  const { adults, children, infants } = input.pax;
  for (const [name, n] of [['adults', adults], ['children', children], ['infants', infants]] as const) {
    if (!Number.isInteger(n) || n < 0) throw new PricingError(`pax.${name} must be a whole number >= 0`);
  }
  const chargeablePax = adults + children + (input.infantsCountInPerPerson ? infants : 0);

  if (adults === 0 && children > 0) {
    const multiplierLines = input.lines.filter(
      (l) => l.basis === 'PER_PERSON' && l.child?.mode === 'MULTIPLIER',
    );
    if (multiplierLines.length > 0) {
      warnings.push(
        `No adults, but ${multiplierLines.length} line(s) price children as a multiple of the adult rate. ` +
          'Set an absolute child rate before sending.',
      );
    }
  }

  /* 2-4. per line: cost -> FX -> markup ---------------------------------- */
  const lines: LineResult[] = [];
  for (const line of input.lines) {
    const costOwnMicros = lineCostMicros(line, input.pax);
    const costOriginal = fromMicros(costOwnMicros, line.costCurrency);

    let costQuoteMicros: Micros;
    if (line.costCurrency === ccy) {
      costQuoteMicros = costOwnMicros;
    } else {
      const rate = input.fx[line.costCurrency];
      if (rate === undefined) {
        throw new PricingError(
          `Missing frozen FX rate ${line.costCurrency} -> ${ccy} (line "${line.label}")`,
        );
      }
      costQuoteMicros = convertMicros(costOwnMicros, rate);
    }

    // Rounding point: the cost and sell printed on the document.
    const cost = fromMicros(costQuoteMicros, ccy);
    const appliedMarkupPct = markupFor(line, input);
    const sell = fromMicros(applyMarkup(toMicros(cost), appliedMarkupPct), ccy);

    if (sell.minor < 0n) {
      throw new PricingError(`Line "${line.label}" would sell below zero`);
    }

    for (const room of line.rooms ?? []) {
      if (room.capacity !== undefined && room.paxInRoom !== undefined && room.paxInRoom > room.capacity) {
        warnings.push(
          `"${line.label}": ${room.paxInRoom} guests in a ${room.occupancy} room that sleeps ${room.capacity}.`,
        );
      }
    }

    lines.push({
      lineId: line.id,
      label: line.label,
      type: line.type,
      dayId: line.dayId ?? null,
      isOptional: line.isOptional ?? false,
      costOriginal,
      cost,
      sell,
      margin: subMoney(sell, cost),
      appliedMarkupPct,
      taxClass: line.taxClass ?? defaultTaxClass,
    });
  }

  const billable = lines.filter((l) => !l.isOptional);

  /* 5. rollups ----------------------------------------------------------- */
  const dayMap = new Map<string | null, LineResult[]>();
  for (const l of billable) {
    const bucket = dayMap.get(l.dayId);
    if (bucket) bucket.push(l);
    else dayMap.set(l.dayId, [l]);
  }
  const days: DayResult[] = [...dayMap.entries()].map(([dayId, group]) => {
    const cost = sumMoney(group.map((g) => g.cost), ccy);
    const sell = sumMoney(group.map((g) => g.sell), ccy);
    return { dayId, cost, sell, margin: subMoney(sell, cost), lineIds: group.map((g) => g.lineId) };
  });

  const totalCost = sumMoney(billable.map((l) => l.cost), ccy);
  const subtotalSell = sumMoney(billable.map((l) => l.sell), ccy);

  /* 6. discounts (after markup, before tax) ------------------------------ */
  let runningBase = toMicros(subtotalSell);
  let discountMicros = 0n;
  for (const d of input.discounts ?? []) {
    let amount: Micros;
    if (d.kind === 'PERCENT') amount = pctOf(runningBase, d.pct);
    else if (d.kind === 'ABS') amount = d.amountMinor * MICRO;
    else amount = d.amountMinor * MICRO * BigInt(chargeablePax);

    if (amount < 0n) throw new PricingError(`Discount "${d.label}" is negative`);
    discountMicros += amount;
    runningBase -= amount;
  }
  let discountTotal = fromMicros(discountMicros, ccy);
  if (discountTotal.minor > subtotalSell.minor) {
    throw new PricingError(
      `Discounts (${discountTotal.minor}) exceed the subtotal (${subtotalSell.minor}) — a quote cannot be negative`,
    );
  }
  const net = subMoney(subtotalSell, discountTotal);

  /* 7. tax, per class, on each class's discounted share ------------------- */
  const classNames = [...new Set(billable.map((l) => l.taxClass))];
  const classBases = classNames.map((name) =>
    sumMoney(billable.filter((l) => l.taxClass === name).map((l) => l.sell), ccy),
  );
  const discountShares = splitByWeight(discountTotal, classBases.map((b) => b.minor));

  const taxByClass: Record<string, Money> = {};
  let taxTotalMinor = 0n;
  classNames.forEach((name, i) => {
    const base = classBases[i] ?? zero(ccy);
    const share = discountShares[i] ?? zero(ccy);
    const taxableBase = subMoney(base, share);
    const rate = input.taxRatesByClass?.[name] ?? 0n;
    // Rounding point: each tax amount.
    const tax = fromMicros(pctOf(toMicros(taxableBase), rate), ccy);
    taxByClass[name] = tax;
    taxTotalMinor += tax.minor;
  });
  const taxTotal = money(taxTotalMinor, ccy);

  /* 8. grand total, rounded once ----------------------------------------- */
  const beforeRounding = addMoney(net, taxTotal);
  const grandTotal = money(roundToUnit(beforeRounding.minor, input.roundingUnit ?? 1n), ccy);
  const roundingAdjustment = subMoney(grandTotal, beforeRounding);

  /* 9. per-person: allocate, never divide --------------------------------- */
  const perPersonAllocation = chargeablePax > 0 ? allocate(grandTotal, chargeablePax) : [];
  const perPerson = perPersonAllocation[0] ?? null;
  if (chargeablePax === 0) {
    warnings.push('No chargeable passengers — a per-person figure cannot be shown.');
  }

  /* margins -------------------------------------------------------------- */
  const margin = subMoney(net, totalCost);
  const marginPct = net.minor === 0n ? 0n : divRoundHalfUp(margin.minor * PCT, net.minor);
  const markupPct = totalCost.minor === 0n ? 0n : divRoundHalfUp(margin.minor * PCT, totalCost.minor);
  if (margin.minor < 0n) warnings.push('This quotation is priced below cost.');

  return {
    currency: ccy,
    lines,
    days,
    totalCost,
    subtotalSell,
    discountTotal,
    net,
    taxByClass,
    taxTotal,
    roundingAdjustment,
    grandTotal,
    margin,
    marginPct,
    markupPct,
    chargeablePax,
    perPersonAllocation,
    perPerson,
    warnings,
  };
}
