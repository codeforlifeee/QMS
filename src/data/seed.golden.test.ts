import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toEngineInput, tripDuration } from './schema.js';
import type { StoredQuotation } from './schema.js';
import { priceQuotation } from '../pricing/engine.js';
import { formatMoney, sumMoney, toMajorString } from '../pricing/money.js';

/**
 * Golden test over the demo quotation.
 *
 * This is the end-to-end check the PRD calls for: a real quotation, priced through the
 * whole pipeline, with every figure pinned. If a refactor shifts a single paisa, this
 * fails — which is exactly what you want from code that quotes money to clients.
 */

const seed = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'data/quotations/q_demo_dubai.json'), 'utf8'),
) as StoredQuotation;

const result = priceQuotation(toEngineInput(seed));

describe('demo Dubai quotation', () => {
  it('derives the trip duration from the dates', () => {
    expect(tripDuration(seed)).toEqual({ days: 6, nights: 5 });
  });

  it('converts each supplier line from its own currency', () => {
    const byId = new Map(result.lines.map((l) => [l.lineId, l]));

    // Flight is already INR and is markup-locked: 34,500 x 3 pax, sold at cost.
    const flight = byId.get('l_flight')!;
    expect(flight.costOriginal.ccy).toBe('INR');
    expect(toMajorString(flight.cost)).toBe('103500.00');
    expect(flight.sell.minor).toBe(flight.cost.minor);

    // Visa is AED 350 x 3 = AED 1,050 -> INR at 22.85 = 23,992.50, +10% = 26,391.75
    const visa = byId.get('l_visa')!;
    expect(visa.costOriginal.ccy).toBe('AED');
    expect(toMajorString(visa.costOriginal)).toBe('1050.00');
    expect(toMajorString(visa.cost)).toBe('23992.50');
    expect(toMajorString(visa.sell)).toBe('26391.75');

    // Hotel: (420 + 120 extra bed) x 1 room x 5 nights = AED 2,700 -> 61,695, +15%
    const hotel = byId.get('l_hotel')!;
    expect(toMajorString(hotel.costOriginal)).toBe('2700.00');
    expect(toMajorString(hotel.cost)).toBe('61695.00');
    expect(toMajorString(hotel.sell)).toBe('70949.25');

    // Safari: 250 x 2 adults + 125 x 1 child = AED 625 -> 14,281.25, +40%
    const safari = byId.get('l_safari')!;
    expect(toMajorString(safari.costOriginal)).toBe('625.00');
    expect(toMajorString(safari.sell)).toBe('19993.75');
  });

  it('excludes the optional dhow cruise from the totals but still lists it', () => {
    const cruise = result.lines.find((l) => l.lineId === 'l_cruise')!;
    expect(cruise.isOptional).toBe(true);
    const billable = result.lines.filter((l) => !l.isOptional);
    expect(sumMoney(billable.map((l) => l.sell), 'INR').minor).toBe(result.subtotalSell.minor);
  });

  it('produces the pinned totals', () => {
    expect({
      totalCost: toMajorString(result.totalCost),
      subtotalSell: toMajorString(result.subtotalSell),
      discountTotal: toMajorString(result.discountTotal),
      net: toMajorString(result.net),
      taxTotal: toMajorString(result.taxTotal),
      grandTotal: toMajorString(result.grandTotal),
      margin: toMajorString(result.margin),
    }).toMatchInlineSnapshot(`
      {
        "discountTotal": "8125.12",
        "grandTotal": "275848.00",
        "margin": "22352.21",
        "net": "262712.29",
        "subtotalSell": "270837.41",
        "taxTotal": "13135.61",
        "totalCost": "240360.08",
      }
    `);
  });

  it('reconciles — every component adds up to the grand total', () => {
    expect(result.grandTotal.minor).toBe(
      result.net.minor + result.taxTotal.minor + result.roundingAdjustment.minor,
    );
    expect(result.net.minor).toBe(result.subtotalSell.minor - result.discountTotal.minor);
    expect(result.margin.minor).toBe(result.net.minor - result.totalCost.minor);
  });

  it('rounds the grand total to the nearest rupee', () => {
    expect(result.grandTotal.minor % 100n).toBe(0n);
  });

  it('allocates per person so the parts sum exactly to the total', () => {
    expect(result.chargeablePax).toBe(3);
    expect(sumMoney(result.perPersonAllocation, 'INR').minor).toBe(result.grandTotal.minor);
  });

  it('keeps a healthy margin and reports it two ways', () => {
    expect(result.margin.minor).toBeGreaterThan(0n);
    // margin on sell vs markup on cost are different numbers; both are exposed
    expect(result.marginPct).toBeGreaterThan(0n);
    expect(result.markupPct).toBeGreaterThan(result.marginPct);
  });

  it('raises no warnings for a well-formed quotation', () => {
    expect(result.warnings).toEqual([]);
  });

  it('formats money in the quote currency only', () => {
    const formatted = formatMoney(result.grandTotal, { showDecimals: false });
    expect(formatted).toContain('₹');
    expect(formatted).not.toContain('AED');
  });
});
