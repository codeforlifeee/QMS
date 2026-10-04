import type { ParsedIntent } from './parse';
import type { GroundedItem, GroundedActivity, GroundedTransfer } from './ground';
import { loadDefaults } from '../../catalog/catalog.js';
import { newId, newToken } from '../../data/repo.js';
import type { StoredQuotation, StoredLine, StoredDay } from '../../data/schema';
import { toEngineInput } from '../../data/schema.js';
import type { Citation, CitationMap } from '../citations.js';
import { newDayId, newLineId, defaultLineOf } from '../../editor/factories.js';
import { DEFAULT_PAYMENT_POLICY, DEFAULT_TERMS, DEFAULT_INCLUSIONS, DEFAULT_EXCLUSIONS } from '../../config/company.js';
import { capacityOf } from '../../catalog/match.js';

/**
 * Step 3 — build. Fully deterministic: no LLM call at all.
 *
 * Every rate on the quotation is copied from the catalog row the grounding step
 * matched, converted once from the catalog's integer minor units (fils) to the decimal
 * string the schema stores. Asking a model to emit prices here was the single biggest
 * source of wrong quotations — it would invent plausible-looking numbers that matched
 * nothing in the catalog, and there was no way to tell which figures were real.
 *
 * Because this step is pure, its output is reproducible and testable: same intent plus
 * same catalog always yields the same lines, and every priced line carries a citation
 * back to its source row.
 */

export interface BuildResult {
  readonly quotation: StoredQuotation;
  readonly citations: CitationMap;
  readonly warnings: readonly string[];
}

/** Catalog money is integer minor units; the schema stores decimal strings. */
function fromMinor(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minor));
  return `${sign}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function monthToDate(travelMonth: string, now: Date): Date | null {
  const cleaned = travelMonth.trim().toLowerCase();
  const yearMatch = /\b(20\d{2})\b/.exec(cleaned);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;

  for (const [name, idx] of Object.entries(MONTH_NAMES)) {
    if (cleaned.includes(name)) {
      if (year) return new Date(year, idx, 1);
      // Pick the next occurrence of this month
      const thisYear = now.getFullYear();
      const candidate = new Date(thisYear, idx, 1);
      return candidate >= now ? candidate : new Date(thisYear + 1, idx, 1);
    }
  }
  return null;
}

export async function buildQuotation(
  intent: ParsedIntent,
  grounded: readonly GroundedItem[],
): Promise<BuildResult> {
  const defaults = await loadDefaults();
  const fxAedPerUsd = defaults?.fxAedPerUsd ?? 3.65;
  const fxInrPerUsd = defaults?.fxInrPerUsd ?? 85.59;
  const markupPct = (defaults?.markupPct ?? 0.15) * 100; // schema wants 15, not 0.15

  const warnings: string[] = [];
  const citations: CitationMap = {};
  const lines: StoredLine[] = [];
  const pax = Math.max(1, (intent.adults || 0) + (intent.children || 0));

  // ---- days ----
  const totalDays = Math.max(1, (intent.nights || 0) + 1);
  const days: StoredDay[] = Array.from({ length: totalDays }, (_, i) => ({
    id: newDayId(),
    index: i + 1,
    title: `Day ${i + 1}`,
    prose: '',
  }));
  const dayIdFor = (n?: number): string | null =>
    n && n >= 1 && n <= days.length ? days[n - 1]!.id : null;

  // Activities the client didn't pin to a day get spread across the days that are
  // actually available for sightseeing — arrival and departure days stay clear.
  // Uses balanced assignment instead of round-robin so no single day gets overloaded.
  const sightseeingDays = days.length > 2 ? days.slice(1, -1) : days;
  const dayActivityCounts = new Map<string, number>();
  for (const d of sightseeingDays) dayActivityCounts.set(d.id, 0);

  const nextSpreadDay = (): string | null => {
    if (sightseeingDays.length === 0) return null;
    let minCount = Infinity;
    let minDay = sightseeingDays[0]!;
    for (const d of sightseeingDays) {
      const count = dayActivityCounts.get(d.id) ?? 0;
      if (count < minCount) { minCount = count; minDay = d; }
    }
    dayActivityCounts.set(minDay.id, minCount + 1);
    return minDay.id;
  };

  // ---- deduplicate grounded activities by catalog ref ----
  const seenCatalogRefs = new Map<string, GroundedItem>();
  const dedupedGrounded = grounded.filter((item) => {
    if (item.kind !== 'activity') return true;
    const ref = item.product?.id ?? item.cityTour?.id;
    if (!ref) return true;
    const prev = seenCatalogRefs.get(ref);
    if (prev) {
      warnings.push(
        `"${item.intentItem}" is the same catalog product as "${prev.intentItem}" — kept once`,
      );
      return false;
    }
    seenCatalogRefs.set(ref, item);
    return true;
  });

  // ---- activity + city-tour lines ----
  for (const item of dedupedGrounded) {
    if (item.kind !== 'activity') continue;
    const dayId = dayIdFor(item.dayNumber) ?? nextSpreadDay();
    if (dayId) dayActivityCounts.set(dayId, (dayActivityCounts.get(dayId) ?? 0) + 1);
    const built = activityLine(item, dayId);
    if (!built) {
      warnings.push(`No catalog match for "${item.intentItem}" — add this line manually`);
      continue;
    }
    // Apply quantity from parsed intent
    if (item.quantity && item.quantity > 1) {
      (built.line as any).qty = item.quantity;
    }
    lines.push(built.line);
    citations[built.line.id] = [built.citation];
    if (item.matchScore < 0.6) {
      warnings.push(
        `"${item.intentItem}" matched "${built.citation.source.productName}" with low `
          + `confidence (${Math.round(item.matchScore * 100)}%) — please verify`,
      );
    }
    // Warn when child pricing falls back to the 0.5x multiplier
    if (item.product && item.product.childCostAed == null && (intent.children || 0) > 0) {
      warnings.push(
        `"${item.product.product}" uses estimated child pricing (50% of adult) — no catalog child rate available`,
      );
    }
  }

  // ---- transfer lines ----
  const arrivalDayId = days[0]!.id;
  const departureDayId = days[days.length - 1]!.id;
  let airportSeen = 0;

  for (const item of dedupedGrounded) {
    if (item.kind !== 'transfer') continue;

    let dayId: string | null = null;
    let directionLabel = '';
    if (item.transferType === 'airport') {
      if (airportSeen === 0) {
        dayId = arrivalDayId;
        directionLabel = ' (Arrival)';
      } else if (airportSeen === 1) {
        dayId = departureDayId;
        directionLabel = ' (Departure)';
      }
      airportSeen++;
    }

    const built = transferLine(item, dayId, pax, directionLabel);
    if (!built) {
      warnings.push(`No transport match for "${item.intentItem}" — add this transfer manually`);
      continue;
    }
    if (built.vehiclesNeeded > 1) {
      warnings.push(
        `${built.vehiclesNeeded} vehicles needed for ${pax} passengers on "${item.intentItem}"`,
      );
    }
    lines.push(built.line);
    citations[built.line.id] = [built.citation];
  }

  // ---- hotels: no catalog yet, so emit a priced-at-zero placeholder ----
  for (const item of dedupedGrounded) {
    if (item.kind !== 'hotel') continue;
    lines.push({
      ...defaultLineOf('HOTEL'),
      id: newLineId(),
      label: item.intentItem,
      nights: item.nights ?? intent.nights ?? 1,
    });
    warnings.push(`Hotel "${item.intentItem}" needs a rate — no hotel catalog imported yet`);
  }

  // ---- visa / flights / meals: known requirements, unknown rates ----
  if (intent.visa) {
    lines.push({ ...defaultLineOf('VISA'), id: newLineId(), label: 'UAE Tourist Visa' });
    warnings.push('Visa line needs a rate');
  }
  for (const f of intent.flights) {
    lines.push({
      ...defaultLineOf('FLIGHT'),
      id: newLineId(),
      label: `Flight ${f.from} - ${f.to}`,
    });
    warnings.push(`Flight ${f.from}-${f.to} needs a rate`);
  }
  for (const m of intent.meals) {
    lines.push({
      ...defaultLineOf('MEAL', dayIdFor(m.dayNumber)),
      id: newLineId(),
      label: m.type,
    });
    warnings.push(`Meal "${m.type}" needs a rate`);
  }

  // ---- travel dates: use travelMonth when available ----
  const now = new Date();
  let travelStartDate = now;
  if (intent.travelMonth) {
    const parsed = monthToDate(intent.travelMonth, now);
    if (parsed) {
      travelStartDate = parsed;
    } else {
      warnings.push(
        `Could not interpret travel month "${intent.travelMonth}" — using today as start date`,
      );
    }
  }
  const travelStart = travelStartDate.toISOString().slice(0, 10);
  const travelEnd = new Date(travelStartDate.getTime() + Math.max(0, intent.nights || 0) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // ---- FX rates: engine expects "1 cost-unit = X quote-units" ----
  const fxMap: Record<string, string> = {
    AED: (1 / fxAedPerUsd).toFixed(6),
    INR: (1 / fxInrPerUsd).toFixed(6),
    USD: '1.00',
  };

  const quotation: StoredQuotation = {
    id: newId(),
    token: newToken(),
    status: 'draft',
    reference: `AI-${now.getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    title: intent.destination
      ? `${intent.destination} — ${intent.nights}N / ${totalDays}D`
      : `${intent.nights}N Itinerary`,
    destination: intent.destination || '',
    client: {
      name: intent.clientName || 'New client',
      ...(intent.clientPhone ? { phone: intent.clientPhone } : {}),
    },
    travelStart,
    travelEnd,
    pax: {
      adults: Math.max(1, intent.adults || 1),
      children: Math.max(0, intent.children || 0),
      infants: Math.max(0, intent.infants || 0),
    },
    quoteCurrency: 'USD',
    fx: fxMap,
    pricingMode: 'PER_SERVICE',
    defaultMarkupByType: {
      ACTIVITY: markupPct,
      HOTEL: markupPct,
      TRANSFER: markupPct,
      MEAL: markupPct,
      VISA: markupPct,
      MISC: markupPct,
      FLIGHT: 0, // air is passed through at cost
    },
    taxRatesByClass: { standard: 5 },
    defaultTaxClass: 'standard',
    taxLabel: 'VAT',
    days,
    lines,
    ...(intent.specialRequests ? { overview: intent.specialRequests } : {}),
    inclusions: [...DEFAULT_INCLUSIONS],
    exclusions: [...DEFAULT_EXCLUSIONS],
    paymentPolicy: [...DEFAULT_PAYMENT_POLICY],
    terms: [...DEFAULT_TERMS],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // ---- validate against the pricing engine ----
  try {
    toEngineInput(quotation);
  } catch (err: any) {
    warnings.push(`Pricing engine rejected the draft: ${err?.message || err}`);
  }

  const priced = lines.filter((l) => l.adultRate !== '0.00').length;
  if (lines.length === 0) {
    warnings.push('Nothing could be grounded from this request — the quotation is empty');
  } else if (priced === 0) {
    warnings.push('No line has a rate yet — every item needs manual pricing');
  }

  return { quotation, citations, warnings };
}

/* ------------------------------------------------------------------ *
 * line builders
 * ------------------------------------------------------------------ */

function activityLine(
  item: GroundedActivity,
  dayId: string | null,
): { line: StoredLine; citation: Citation } | null {
  if (item.product) {
    const p = item.product;
    const id = newLineId();
    const line: StoredLine = {
      ...defaultLineOf('ACTIVITY', dayId),
      id,
      label: p.product,
      ...(p.tour && p.tour !== p.product ? { description: p.tour } : {}),
      adultRate: fromMinor(p.costAed),
      costCurrency: 'AED',
      // Real child pricing beats the 0.5 multiplier default whenever we have it —
      // the EXCURSIONS sheet is the only place this exists.
      ...(p.childCostAed != null
        ? { child: { mode: 'ABSOLUTE' as const, rate: fromMinor(p.childCostAed) } }
        : {}),
      ...(p.toddlerCostAed != null
        ? { infant: { mode: 'ABSOLUTE' as const, rate: fromMinor(p.toddlerCostAed) } }
        : {}),
      catalogRef: p.id,
      supplier: p.supplier,
    };
    return {
      line,
      citation: {
        lineId: id,
        field: 'adultRate',
        source: {
          catalogId: p.id,
          productName: p.product,
          sheetName: item.matchSource,
          originalValueAed: p.costAed,
          matchScore: item.matchScore,
          matchedQuery: item.intentItem,
        },
        alternatives: item.alternatives.map((a) => ({
          catalogId: a.id,
          productName: a.name,
          costAed: a.costAed,
          score: a.score,
        })),
      },
    };
  }

  if (item.cityTour) {
    const t = item.cityTour;
    const id = newLineId();
    const line: StoredLine = {
      ...defaultLineOf('ACTIVITY', dayId),
      id,
      label: t.name,
      ...(t.itinerary && t.itinerary.length > 0
        ? { description: t.itinerary.join(' · ') }
        : {}),
      adultRate: fromMinor(t.rateAed),
      costCurrency: 'AED',
      catalogRef: t.id,
    };
    return {
      line,
      citation: {
        lineId: id,
        field: 'adultRate',
        source: {
          catalogId: t.id,
          productName: t.name,
          sheetName: item.matchSource,
          originalValueAed: t.rateAed,
          matchScore: item.matchScore,
          matchedQuery: item.intentItem,
        },
        alternatives: item.alternatives.map((a) => ({
          catalogId: a.id,
          productName: a.name,
          costAed: a.costAed,
          score: a.score,
        })),
      },
    };
  }

  return null;
}

function transferLine(
  item: GroundedTransfer,
  dayId: string | null,
  pax: number,
  directionLabel: string,
): { line: StoredLine; citation: Citation; vehiclesNeeded: number } | null {
  const t = item.product;
  if (!t) return null;

  const id = newLineId();
  // Parking is a real surcharge on most airport routes; folding it into the line cost
  // keeps the quoted total honest instead of under-quoting by AED 40 a transfer.
  const total = t.rateAed + (t.parkingAed ?? 0);
  const vehicleCap = capacityOf(t.vehicleSize);
  const vehiclesNeeded = Math.max(1, Math.ceil(pax / vehicleCap));

  const line: StoredLine = {
    ...defaultLineOf('TRANSFER', dayId),
    id,
    label: `${t.route} (${t.vehicleSize})${directionLabel}`,
    ...(t.parkingAed ? { description: `Includes AED ${fromMinor(t.parkingAed)} parking` } : {}),
    adultRate: fromMinor(total),
    costCurrency: 'AED',
    qty: vehiclesNeeded,
    catalogRef: t.id,
    supplier: t.supplier,
  };
  return {
    line,
    citation: {
      lineId: id,
      field: 'adultRate',
      source: {
        catalogId: t.id,
        productName: `${t.route} — ${t.vehicleSize}`,
        sheetName: item.matchSource,
        originalValueAed: total,
        matchScore: item.matchScore,
        matchedQuery: item.intentItem,
      },
      alternatives: item.alternatives.map((a) => ({
        catalogId: a.id,
        productName: a.name,
        costAed: a.costAed,
        score: a.score,
      })),
    },
    vehiclesNeeded,
  };
}
