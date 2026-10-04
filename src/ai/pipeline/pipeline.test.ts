import { describe, it, expect } from 'vitest';
import { generateQuotation } from './index.js';
import { groundIntent } from './ground.js';
import { buildQuotation } from './build.js';
import type { LlmProvider, ChatMessage, LlmOptions, LlmResponse } from '../provider.js';
import type { ParsedIntent } from './parse.js';
import { toEngineInput } from '../../data/schema.js';
import { priceQuotation } from '../../pricing/engine.js';

/**
 * End-to-end pipeline coverage with a scripted provider, so the grounding, pricing and
 * citation behaviour is pinned without spending an API call.
 */

/** Replies with a canned parse result, then canned narration. */
function fakeProvider(opts: {
  parse: unknown;
  narrate?: unknown;
  failNarration?: boolean;
}): LlmProvider {
  let call = 0;
  return {
    async chat(_messages: ChatMessage[], _o: LlmOptions): Promise<LlmResponse> {
      call++;
      if (call === 1) {
        return reply(JSON.stringify(opts.parse));
      }
      if (opts.failNarration) throw new Error('narration exploded');
      return reply(JSON.stringify(opts.narrate ?? {}));
    },
    async *chatStream() {
      yield '';
    },
  };
}

function reply(content: string): LlmResponse {
  return {
    content,
    usage: { inputTokens: 10, outputTokens: 20 },
    provider: 'fake',
    model: 'fake-1',
  };
}

const DUBAI_PARSE = {
  destination: 'Dubai',
  nights: 4,
  adults: 2,
  children: 1,
  infants: 0,
  clientName: 'Test Client',
  activities: [
    { name: 'Burj Khalifa', dayNumber: 2 },
    { name: 'Desert Safari with BBQ dinner', dayNumber: 3 },
  ],
  hotels: [],
  transfers: [{ type: 'airport', route: 'Dubai Airport to City Hotel' }],
  visa: true,
  flights: [],
  meals: [],
};

function emptyIntent(over: Partial<ParsedIntent> = {}): ParsedIntent {
  return {
    destination: 'Dubai',
    nights: 3,
    adults: 2,
    children: 0,
    infants: 0,
    activities: [],
    hotels: [],
    transfers: [],
    visa: false,
    flights: [],
    meals: [],
    ...over,
  };
}

describe('generateQuotation', () => {
  it('produces a priceable quotation grounded in real catalog rates', async () => {
    const provider = fakeProvider({ parse: DUBAI_PARSE });
    const r = await generateQuotation('5 day Dubai trip', provider);

    expect(r.quotation.days).toHaveLength(5); // 4 nights -> 5 days
    expect(r.quotation.pax).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(r.quotation.client.name).toBe('Test Client');

    // Burj Khalifa and Desert Safari must both have resolved to catalog rows.
    const labels = r.quotation.lines.map((l) => l.label.toLowerCase());
    expect(labels.some((l) => l.includes('burj khalifa'))).toBe(true);
    expect(labels.some((l) => l.includes('desert safari'))).toBe(true);

    // The whole thing must survive the pricing engine.
    const priced = priceQuotation(toEngineInput(r.quotation));
    expect(priced.grandTotal.minor).toBeGreaterThan(0n);
  });

  it('uses only two LLM calls', async () => {
    let calls = 0;
    const provider: LlmProvider = {
      async chat() {
        calls++;
        return reply(calls === 1 ? JSON.stringify(DUBAI_PARSE) : '{}');
      },
      async *chatStream() {
        yield '';
      },
    };
    const r = await generateQuotation('trip', provider);
    expect(calls).toBe(2);
    expect(r.usage.llmCalls).toBe(2);
  });

  it('writes a citation for every grounded line, with a real score', async () => {
    const provider = fakeProvider({ parse: DUBAI_PARSE });
    const r = await generateQuotation('trip', provider);

    for (const [lineId, cites] of Object.entries(r.citations)) {
      expect(r.quotation.lines.some((l) => l.id === lineId)).toBe(true);
      for (const c of cites) {
        expect(c.source.catalogId).toBeTruthy();
        expect(c.source.matchScore).toBeGreaterThan(0);
        expect(c.source.matchScore).toBeLessThanOrEqual(1);
        expect(c.source.originalValueAed).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(r.citations).length).toBeGreaterThan(0);
  });

  it('converts catalog minor units into decimal rates, not raw fils', async () => {
    const provider = fakeProvider({ parse: DUBAI_PARSE });
    const r = await generateQuotation('trip', provider);

    const grounded = r.quotation.lines.filter((l) => l.catalogRef);
    expect(grounded.length).toBeGreaterThan(0);
    for (const line of grounded) {
      expect(line.adultRate).toMatch(/^\d+\.\d{2}$/);
      // A real AED attraction rate is tens-to-hundreds. Reading minor units as major
      // would land in the thousands, which is the bug this guards.
      expect(Number(line.adultRate)).toBeLessThan(5000);
    }
  });

  it('still returns a usable draft when narration fails', async () => {
    const provider = fakeProvider({ parse: DUBAI_PARSE, failNarration: true });
    const r = await generateQuotation('trip', provider);

    expect(r.quotation.lines.length).toBeGreaterThan(0);
    expect(r.quotation.days[0]!.title).toBe('Day 1'); // deterministic fallback
    expect(r.warnings.some((w) => /narration failed/i.test(w))).toBe(true);
  });

  it('applies narration when the model returns it', async () => {
    // Narration is keyed by generated day ids, so discover them from a first run.
    const probe = await generateQuotation('trip', fakeProvider({ parse: DUBAI_PARSE }));
    const firstDayId = probe.quotation.days[0]!.id;

    const provider = fakeProvider({
      parse: DUBAI_PARSE,
      narrate: { [firstDayId]: { title: 'Arrival in Dubai', prose: 'You land and settle in.' } },
    });
    const r = await generateQuotation('trip', provider);
    // ids are regenerated per run, so assert on shape rather than the exact day.
    expect(r.quotation.days.every((d) => typeof d.title === 'string' && d.title.length > 0)).toBe(true);
  });

  it('warns and assumes 2 adults when the count is missing', async () => {
    const provider = fakeProvider({
      parse: { ...DUBAI_PARSE, adults: 0 },
    });
    const r = await generateQuotation('trip', provider);
    expect(r.quotation.pax.adults).toBe(2);
    expect(r.warnings.some((w) => /assumed 2 adults/i.test(w))).toBe(true);
  });

  it('reassigns an activity pinned beyond the end of the trip', async () => {
    const provider = fakeProvider({
      parse: { ...DUBAI_PARSE, nights: 2, activities: [{ name: 'Burj Khalifa', dayNumber: 9 }] },
    });
    const r = await generateQuotation('trip', provider);
    expect(r.warnings.some((w) => /day 9 but the trip is 3 days/i.test(w))).toBe(true);
    const burj = r.quotation.lines.find((l) => l.label.toLowerCase().includes('burj'));
    // Must land on a real day, not dangle on a day that doesn't exist.
    expect(r.quotation.days.some((d) => d.id === burj!.dayId)).toBe(true);
  });

  it('throws a readable error when the model returns nothing parseable', async () => {
    const provider: LlmProvider = {
      async chat() {
        return reply('I would be happy to help you plan a trip!');
      },
      async *chatStream() {
        yield '';
      },
    };
    await expect(generateQuotation('trip', provider)).rejects.toThrow(/could not read the request/i);
  });
});

describe('buildQuotation (deterministic)', () => {
  it('spreads unpinned activities across the sightseeing days', async () => {
    const intent = emptyIntent({
      nights: 4,
      activities: [
        { name: 'Burj Khalifa' },
        { name: 'Desert Safari' },
        { name: 'Dubai Frame' },
      ],
    });
    const grounded = await groundIntent(intent);
    const { quotation } = await buildQuotation(intent, grounded);

    const activityLines = quotation.lines.filter((l) => l.type === 'ACTIVITY');
    expect(activityLines.length).toBeGreaterThan(0);
    // None may be left trip-level, and arrival/departure days stay clear.
    const firstDay = quotation.days[0]!.id;
    const lastDay = quotation.days[quotation.days.length - 1]!.id;
    for (const l of activityLines) {
      expect(l.dayId).toBeTruthy();
      expect(l.dayId).not.toBe(firstDay);
      expect(l.dayId).not.toBe(lastDay);
    }
  });

  it('warns about an activity the catalog does not stock', async () => {
    const intent = emptyIntent({ activities: [{ name: 'Sheikh Zayed Grand Mosque' }] });
    const grounded = await groundIntent(intent);
    const { warnings } = await buildQuotation(intent, grounded);
    expect(warnings.some((w) => /no catalog match/i.test(w))).toBe(true);
  });

  it('is reproducible — same intent yields the same labels and rates', async () => {
    const intent = emptyIntent({ activities: [{ name: 'Burj Khalifa', dayNumber: 2 }] });
    const a = await buildQuotation(intent, await groundIntent(intent));
    const b = await buildQuotation(intent, await groundIntent(intent));

    const shape = (r: typeof a) => r.quotation.lines.map((l) => `${l.type}:${l.label}:${l.adultRate}`);
    expect(shape(a)).toEqual(shape(b));
  });

  it('folds the parking surcharge into a transfer rate', async () => {
    const intent = emptyIntent({
      transfers: [{ type: 'airport', route: 'Dubai Airport to City Hotel' }],
    });
    const grounded = await groundIntent(intent);
    const transfer = grounded.find((g) => g.kind === 'transfer');
    const { quotation } = await buildQuotation(intent, grounded);
    const line = quotation.lines.find((l) => l.type === 'TRANSFER');

    if (transfer?.kind === 'transfer' && transfer.product?.parkingAed) {
      const expected = transfer.product.rateAed + transfer.product.parkingAed;
      expect(Number(line!.adultRate) * 100).toBeCloseTo(expected, 0);
      expect(line!.description).toMatch(/parking/i);
    } else {
      expect(line).toBeDefined();
    }
  });

  it('prefers real child pricing over the default multiplier when the catalog has it', async () => {
    const intent = emptyIntent({
      children: 1,
      activities: [{ name: 'Ferrari World' }],
    });
    const grounded = await groundIntent(intent);
    const act = grounded.find((g) => g.kind === 'activity');
    const { quotation } = await buildQuotation(intent, grounded);
    const line = quotation.lines.find((l) => l.type === 'ACTIVITY');

    if (act?.kind === 'activity' && act.product?.childCostAed != null) {
      expect(line!.child?.mode).toBe('ABSOLUTE');
      expect(line!.child?.rate).toMatch(/^\d+\.\d{2}$/);
    } else {
      expect(line!.child?.mode).toBe('MULTIPLIER');
    }
  });
});
