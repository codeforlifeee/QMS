import { describe, it, expect } from 'vitest';
import { priceQuotation, PricingError } from './engine.js';
import {
  pctFromFraction,
  pctFromPercent,
  rateFromDecimal,
  sumMoney,
  toMajorString,
} from './money.js';
import type { LineItem, QuotationInput } from './types.js';

const AED_INR = rateFromDecimal('22.85');

/** A realistic Dubai quote: 2 adults + 1 child, AED tours, an INR visa fee. */
function dubaiQuote(overrides: Partial<QuotationInput> = {}): QuotationInput {
  const lines: LineItem[] = [
    {
      id: 'l1',
      dayId: 'd1',
      type: 'ACTIVITY',
      label: 'Desert Safari',
      basis: 'PER_PERSON',
      costCurrency: 'AED',
      adultRateMinor: 25_000n, // AED 250.00
      child: { mode: 'MULTIPLIER', multiplier: pctFromFraction(0.5) },
      infant: { mode: 'FREE' },
    },
    {
      id: 'l2',
      dayId: 'd1',
      type: 'HOTEL',
      label: 'Rove Marina — 2 nights',
      basis: 'PER_ROOM_NIGHT',
      costCurrency: 'AED',
      adultRateMinor: 0n,
      nights: 2,
      rooms: [{ occupancy: 'TWIN', roomCount: 1, roomRateMinor: 40_000n }], // AED 400/night
    },
    {
      id: 'l3',
      dayId: null, // trip-level
      type: 'VISA',
      label: 'UAE Visa',
      basis: 'PER_UNIT',
      costCurrency: 'INR', // <- the line that used to corrupt the AED subtotal
      adultRateMinor: 29_500n, // INR 295.00
      qty: 3,
    },
  ];

  return {
    quoteCurrency: 'INR',
    pax: { adults: 2, children: 1, infants: 0 },
    pricingMode: 'PER_SERVICE',
    defaultMarkupByType: {
      ACTIVITY: pctFromPercent(18),
      HOTEL: pctFromPercent(18),
      VISA: pctFromPercent(18),
    },
    fx: { AED: AED_INR },
    taxRatesByClass: { standard: pctFromPercent(5) },
    lines,
    ...overrides,
  };
}

describe('a real mixed-currency quotation', () => {
  it('converts each line from its own currency and never mixes them', () => {
    const r = priceQuotation(dubaiQuote());

    // supplier cost stays in its original currency for invoice reconciliation
    expect(toMajorString(r.lines[0]!.costOriginal)).toBe('625.00'); // AED
    expect(r.lines[0]!.costOriginal.ccy).toBe('AED');
    expect(toMajorString(r.lines[2]!.costOriginal)).toBe('885.00'); // INR
    expect(r.lines[2]!.costOriginal.ccy).toBe('INR');

    // ...and everything is expressed in the quote currency
    expect(toMajorString(r.lines[0]!.cost)).toBe('14281.25'); // 625 AED x 22.85
    expect(toMajorString(r.lines[1]!.cost)).toBe('18280.00'); // 800 AED x 22.85
    expect(toMajorString(r.lines[2]!.cost)).toBe('885.00'); // already INR
    expect(r.lines.every((l) => l.cost.ccy === 'INR')).toBe(true);
  });

  it('produces the hand-computed totals', () => {
    const r = priceQuotation(dubaiQuote());
    expect(toMajorString(r.totalCost)).toBe('33446.25');
    expect(toMajorString(r.subtotalSell)).toBe('39466.58');
    expect(toMajorString(r.margin)).toBe('6020.33');
    expect(toMajorString(r.taxTotal)).toBe('1973.33');
    expect(toMajorString(r.grandTotal)).toBe('41439.91');
  });

  it('fails loudly when a frozen FX rate is missing rather than assuming 1:1', () => {
    const input = dubaiQuote({ fx: {} });
    expect(() => priceQuotation(input)).toThrow(PricingError);
    expect(() => priceQuotation(input)).toThrow(/Missing frozen FX rate AED -> INR/);
  });
});

describe('invariants', () => {
  it('1. line sells sum exactly to the subtotal', () => {
    const r = priceQuotation(dubaiQuote());
    const billable = r.lines.filter((l) => !l.isOptional);
    expect(sumMoney(billable.map((l) => l.sell), 'INR').minor).toBe(r.subtotalSell.minor);
  });

  it('2. grand total reconciles to net + tax + rounding adjustment', () => {
    const r = priceQuotation(dubaiQuote({ roundingUnit: 10_000n })); // nearest INR 100
    expect(r.grandTotal.minor).toBe(r.net.minor + r.taxTotal.minor + r.roundingAdjustment.minor);
    expect(r.grandTotal.minor % 10_000n).toBe(0n);
  });

  it('3. the per-person allocation sums exactly to the grand total', () => {
    for (const pax of [{ adults: 1, children: 0, infants: 0 }, { adults: 2, children: 1, infants: 0 }, { adults: 5, children: 2, infants: 1 }]) {
      const r = priceQuotation(dubaiQuote({ pax }));
      expect(sumMoney(r.perPersonAllocation, 'INR').minor).toBe(r.grandTotal.minor);
      expect(r.perPersonAllocation).toHaveLength(r.chargeablePax);
    }
  });

  it('4. margin equals sell minus cost at line, day and quote level', () => {
    const r = priceQuotation(dubaiQuote());
    for (const l of r.lines) expect(l.margin.minor).toBe(l.sell.minor - l.cost.minor);
    for (const d of r.days) expect(d.margin.minor).toBe(d.sell.minor - d.cost.minor);
    expect(r.margin.minor).toBe(r.net.minor - r.totalCost.minor);
    // day margins roll up to the quote margin when there is no discount
    expect(sumMoney(r.days.map((d) => d.margin), 'INR').minor).toBe(r.margin.minor);
  });

  it('5. FLAT mode applied per line equals applying it to the subtotal', () => {
    const r = priceQuotation(dubaiQuote({ pricingMode: 'FLAT', flatMarkupPct: pctFromPercent(20) }));
    // sum(cost_i * 1.2) == sum(cost_i) * 1.2
    const expected = (r.totalCost.minor * 120n) / 100n;
    expect(r.subtotalSell.minor).toBe(expected);
  });

  it('7. is deterministic', () => {
    const a = priceQuotation(dubaiQuote());
    const b = priceQuotation(dubaiQuote());
    expect(JSON.stringify(a, bigintSafe)).toBe(JSON.stringify(b, bigintSafe));
  });

  it('10. is monotonic — raising a cost never lowers the total', () => {
    const base = priceQuotation(dubaiQuote());
    const dearer = dubaiQuote();
    const raised = {
      ...dearer,
      lines: dearer.lines.map((l) => (l.id === 'l1' ? { ...l, adultRateMinor: 30_000n } : l)),
    };
    expect(priceQuotation(raised).grandTotal.minor).toBeGreaterThan(base.grandTotal.minor);
  });

  it('10b. raising a discount never raises the total', () => {
    const none = priceQuotation(dubaiQuote());
    const discounted = priceQuotation(
      dubaiQuote({ discounts: [{ kind: 'PERCENT', pct: pctFromPercent(10), label: 'Early bird' }] }),
    );
    expect(discounted.grandTotal.minor).toBeLessThan(none.grandTotal.minor);
  });

  it('13. emits no non-integer numbers', () => {
    const r = priceQuotation(dubaiQuote());
    const bad: string[] = [];
    walk(r, '', bad);
    expect(bad).toEqual([]);
  });
});

describe('pax tiers', () => {
  it('does not hardcode a 0.5 child multiplier', () => {
    const quarter = priceQuotation(
      dubaiQuote({
        lines: [
          {
            id: 'x',
            type: 'ACTIVITY',
            label: 'Park',
            basis: 'PER_PERSON',
            costCurrency: 'INR',
            adultRateMinor: 10_000n, // INR 100
            child: { mode: 'MULTIPLIER', multiplier: pctFromFraction(0.25) },
          },
        ],
        defaultMarkupByType: {},
        taxRatesByClass: {},
      }),
    );
    // 2 adults @100 + 1 child @25 = 225
    expect(toMajorString(quarter.totalCost)).toBe('225.00');
  });

  it('supports an absolute child rate and a free infant', () => {
    const r = priceQuotation(
      dubaiQuote({
        pax: { adults: 2, children: 1, infants: 1 },
        lines: [
          {
            id: 'x',
            type: 'ACTIVITY',
            label: 'Cruise',
            basis: 'PER_PERSON',
            costCurrency: 'INR',
            adultRateMinor: 10_000n,
            child: { mode: 'ABSOLUTE', rateMinor: 3_000n }, // INR 30 flat
            infant: { mode: 'FREE' },
          },
        ],
        defaultMarkupByType: {},
        taxRatesByClass: {},
      }),
    );
    expect(toMajorString(r.totalCost)).toBe('230.00'); // 100+100+30+0
  });

  it('excludes infants from the per-person head count by default', () => {
    const r = priceQuotation(dubaiQuote({ pax: { adults: 2, children: 0, infants: 1 } }));
    expect(r.chargeablePax).toBe(2);
  });
});

describe('hotels', () => {
  it('charges a single supplement and extra beds without dividing pax by two', () => {
    const r = priceQuotation(
      dubaiQuote({
        pax: { adults: 3, children: 0, infants: 0 },
        lines: [
          {
            id: 'h',
            type: 'HOTEL',
            label: 'Hotel — 2 nights, 1 twin + 1 single',
            basis: 'PER_ROOM_NIGHT',
            costCurrency: 'INR',
            adultRateMinor: 0n,
            nights: 2,
            rooms: [
              { occupancy: 'TWIN', roomCount: 1, roomRateMinor: 500_000n }, // INR 5,000
              {
                occupancy: 'SINGLE',
                roomCount: 1,
                roomRateMinor: 400_000n, // INR 4,000
                singleSupplementMinor: 50_000n, // + INR 500
              },
            ],
          },
        ],
        defaultMarkupByType: {},
        taxRatesByClass: {},
      }),
    );
    // (5000 + 4500) x 2 nights
    expect(toMajorString(r.totalCost)).toBe('19000.00');
  });

  it('warns when a room is over capacity but still prices it', () => {
    const r = priceQuotation(
      dubaiQuote({
        lines: [
          {
            id: 'h',
            type: 'HOTEL',
            label: 'Overstuffed room',
            basis: 'PER_ROOM_NIGHT',
            costCurrency: 'INR',
            adultRateMinor: 0n,
            nights: 1,
            rooms: [
              { occupancy: 'TWIN', roomCount: 1, roomRateMinor: 100_000n, capacity: 2, paxInRoom: 4 },
            ],
          },
        ],
        defaultMarkupByType: {},
        taxRatesByClass: {},
      }),
    );
    expect(r.warnings.some((w) => /sleeps 2/.test(w))).toBe(true);
    expect(toMajorString(r.totalCost)).toBe('1000.00');
  });
});

describe('markup behaviour', () => {
  it('passes locked lines through at cost (flights)', () => {
    const r = priceQuotation(
      dubaiQuote({
        lines: [
          {
            id: 'f',
            type: 'FLIGHT',
            label: 'Emirates DXB',
            basis: 'PER_PERSON',
            costCurrency: 'INR',
            adultRateMinor: 1_000_000n, // INR 10,000
            markupLocked: true,
          },
        ],
        defaultMarkupByType: { FLIGHT: pctFromPercent(18) },
        taxRatesByClass: {},
      }),
    );
    expect(r.lines[0]!.sell.minor).toBe(r.lines[0]!.cost.minor);
    expect(r.margin.minor).toBe(0n);
  });

  it('honours a per-line override above the type default', () => {
    const r = priceQuotation(
      dubaiQuote({
        lines: [
          {
            id: 'a',
            type: 'ACTIVITY',
            label: 'Fat margin',
            basis: 'PER_GROUP',
            costCurrency: 'INR',
            adultRateMinor: 100_000n,
            markupPctOverride: pctFromPercent(50),
          },
        ],
        defaultMarkupByType: { ACTIVITY: pctFromPercent(10) },
        taxRatesByClass: {},
      }),
    );
    expect(toMajorString(r.subtotalSell)).toBe('1500.00');
  });

  it('excludes optional lines from every total', () => {
    const withOptional = dubaiQuote();
    const r = priceQuotation({
      ...withOptional,
      lines: [
        ...withOptional.lines,
        {
          id: 'opt',
          type: 'ACTIVITY',
          label: 'Optional add-on',
          basis: 'PER_GROUP',
          costCurrency: 'INR',
          adultRateMinor: 500_000n,
          isOptional: true,
        },
      ],
    });
    expect(toMajorString(r.grandTotal)).toBe('41439.91'); // unchanged
    expect(r.lines).toHaveLength(4); // but still shown on the document
  });

  it('refuses TARGET_MARGIN until the solver lands', () => {
    expect(() => priceQuotation(dubaiQuote({ pricingMode: 'TARGET_MARGIN' }))).toThrow(
      /not implemented/,
    );
  });
});

describe('discounts and tax', () => {
  it('applies the discount before tax, so tax falls on the discounted value', () => {
    const r = priceQuotation(
      dubaiQuote({ discounts: [{ kind: 'PERCENT', pct: pctFromPercent(10), label: '10% off' }] }),
    );
    expect(toMajorString(r.discountTotal)).toBe('3946.66'); // 10% of 39,466.58
    expect(toMajorString(r.net)).toBe('35519.92');
    expect(toMajorString(r.taxTotal)).toBe('1776.00'); // 5% of the NET, not the subtotal
  });

  it('spreads a discount across tax classes pro rata and still reconciles', () => {
    const input = dubaiQuote({
      taxRatesByClass: { standard: pctFromPercent(5), air: pctFromPercent(18) },
      discounts: [{ kind: 'ABS', amountMinor: 100_000n, label: 'Goodwill' }],
    });
    const withClasses: QuotationInput = {
      ...input,
      lines: input.lines.map((l) => (l.type === 'VISA' ? { ...l, taxClass: 'air' } : l)),
    };
    const r = priceQuotation(withClasses);
    const summed = sumMoney(Object.values(r.taxByClass), 'INR');
    expect(summed.minor).toBe(r.taxTotal.minor);
    expect(r.grandTotal.minor).toBe(r.net.minor + r.taxTotal.minor + r.roundingAdjustment.minor);
  });

  it('charges a per-person discount per chargeable head', () => {
    const r = priceQuotation(
      dubaiQuote({ discounts: [{ kind: 'PER_PERSON', amountMinor: 100_000n, label: 'INR 1000/pax' }] }),
    );
    expect(toMajorString(r.discountTotal)).toBe('3000.00'); // 3 pax
  });

  it('rejects a discount larger than the subtotal rather than going negative', () => {
    expect(() =>
      priceQuotation(dubaiQuote({ discounts: [{ kind: 'ABS', amountMinor: 99_999_999n, label: 'oops' }] })),
    ).toThrow(/cannot be negative/);
  });
});

describe('boundaries', () => {
  it('handles zero lines', () => {
    const r = priceQuotation(dubaiQuote({ lines: [] }));
    expect(r.grandTotal.minor).toBe(0n);
    expect(r.margin.minor).toBe(0n);
    expect(r.marginPct).toBe(0n);
  });

  it('handles zero chargeable pax without dividing by zero', () => {
    const r = priceQuotation(dubaiQuote({ pax: { adults: 0, children: 0, infants: 0 } }));
    expect(r.perPerson).toBeNull();
    expect(r.perPersonAllocation).toEqual([]);
    expect(r.warnings.some((w) => /per-person/.test(w))).toBe(true);
  });

  it('warns when children are priced off a non-existent adult rate', () => {
    const r = priceQuotation(dubaiQuote({ pax: { adults: 0, children: 2, infants: 0 } }));
    expect(r.warnings.some((w) => /No adults/.test(w))).toBe(true);
  });

  it('handles zero nights and zero rooms', () => {
    const r = priceQuotation(
      dubaiQuote({
        lines: [
          {
            id: 'h',
            type: 'HOTEL',
            label: 'Day use',
            basis: 'PER_ROOM_NIGHT',
            costCurrency: 'INR',
            adultRateMinor: 0n,
            nights: 0,
            rooms: [{ occupancy: 'TWIN', roomCount: 0, roomRateMinor: 100_000n }],
          },
        ],
        defaultMarkupByType: {},
        taxRatesByClass: {},
      }),
    );
    expect(r.grandTotal.minor).toBe(0n);
  });

  it('flags a below-cost quotation instead of hiding it', () => {
    const r = priceQuotation(
      dubaiQuote({ discounts: [{ kind: 'PERCENT', pct: pctFromPercent(90), label: 'Fire sale' }] }),
    );
    expect(r.margin.minor).toBeLessThan(0n);
    expect(r.warnings.some((w) => /below cost/.test(w))).toBe(true);
  });
});

/* helpers -------------------------------------------------------------- */

function bigintSafe(_k: string, v: unknown): unknown {
  return typeof v === 'bigint' ? `${v}n` : v;
}

function walk(node: unknown, path: string, bad: string[]): void {
  if (typeof node === 'number') {
    if (!Number.isInteger(node)) bad.push(`${path} = ${node}`);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, bad));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, bad);
  }
}
