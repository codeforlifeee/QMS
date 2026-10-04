import type { LlmProvider } from '../provider';
import { extractJson } from '../json.js';
import { withRetry } from '../retry.js';

export interface ParsedIntent {
  destination: string;
  nights: number;
  travelMonth?: string;
  adults: number;
  children: number;
  infants: number;
  clientName?: string;
  clientPhone?: string;
  activities: Array<{ name: string; dayNumber?: number; notes?: string }>;
  hotels: Array<{ name: string; roomType?: string; nights?: number }>;
  transfers: Array<{ type: 'airport' | 'intercity' | 'sightseeing'; route?: string; vehiclePreference?: string }>;
  visa: boolean;
  flights: Array<{ from: string; to: string }>;
  meals: Array<{ type: string; dayNumber?: number }>;
  specialRequests?: string;
  budget?: string;
}

const PARSE_SCHEMA = {
  type: 'object',
  properties: {
    destination: { type: 'string' },
    nights: { type: 'number' },
    travelMonth: { type: 'string' },
    adults: { type: 'number' },
    children: { type: 'number' },
    infants: { type: 'number' },
    clientName: { type: 'string' },
    clientPhone: { type: 'string' },
    activities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          dayNumber: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['name'],
      },
    },
    hotels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          roomType: { type: 'string' },
          nights: { type: 'number' },
        },
        required: ['name'],
      },
    },
    transfers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['airport', 'intercity', 'sightseeing'] },
          route: { type: 'string' },
          vehiclePreference: { type: 'string' },
        },
        required: ['type'],
      },
    },
    visa: { type: 'boolean' },
    flights: {
      type: 'array',
      items: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' } },
        required: ['from', 'to'],
      },
    },
    meals: {
      type: 'array',
      items: {
        type: 'object',
        properties: { type: { type: 'string' }, dayNumber: { type: 'number' } },
        required: ['type'],
      },
    },
    specialRequests: { type: 'string' },
    budget: { type: 'string' },
  },
  required: [
    'destination',
    'nights',
    'adults',
    'children',
    'infants',
    'activities',
    'hotels',
    'transfers',
    'visa',
    'flights',
    'meals',
  ],
};

const SYSTEM_PROMPT = `You are a precise travel-quotation parser. Extract the structured intent from a travel agent's natural language request and reply with a single valid JSON object matching the schema. No prose, no code fences.

Rules:
- Only extract what is clearly stated. Never invent activities, pax counts, or dates.
- If a count is missing, use 0 (for children/infants) or 2 (for adults when a trip is clearly described but adults are not stated — infer only when a trip is obviously being planned).
- "nights" is the number of overnight stays, not the number of days. "5-night trip" = 5. "6-day trip" = 5 nights.
- "dayNumber" on an activity is 1-indexed from day 1 of the trip. Only set it when the user says so ("day 2 Burj Khalifa").
- "transfers": airport = airport pickup/drop; intercity = city-to-city; sightseeing = tour transfer during the day.
- "visa" is true only if a visa service is explicitly requested.
- Omit optional fields rather than inventing values.

Example input: "5 night Dubai trip for 2 adults and 1 kid. Day 2 Burj Khalifa, day 3 desert safari. Airport transfers both ways. Need UAE visa. Client is Rahul 9876543210."

Example output:
{
  "destination": "Dubai",
  "nights": 5,
  "adults": 2,
  "children": 1,
  "infants": 0,
  "clientName": "Rahul",
  "clientPhone": "9876543210",
  "activities": [
    { "name": "Burj Khalifa", "dayNumber": 2 },
    { "name": "desert safari", "dayNumber": 3 }
  ],
  "hotels": [],
  "transfers": [
    { "type": "airport", "route": "Airport to Hotel" },
    { "type": "airport", "route": "Hotel to Airport" }
  ],
  "visa": true,
  "flights": [],
  "meals": []
}

Reply must be valid JSON.`;

export interface ParseResult {
  readonly intent: ParsedIntent;
  readonly usage: { inputTokens: number; outputTokens: number };
  readonly warnings: readonly string[];
}

export async function parseIntent(
  prompt: string,
  provider: LlmProvider,
): Promise<ParseResult> {
  const warnings: string[] = [];

  const response = await withRetry(
    () =>
      provider.chat(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0, maxTokens: 2048, jsonSchema: PARSE_SCHEMA },
      ),
    { onRetry: (n) => warnings.push(`Parse retry ${n} after a transient provider error`) },
  );

  const raw = extractJson<Record<string, unknown>>(response.content);
  if (!raw) {
    throw new Error(
      `Could not read the request. The model returned: ${response.content.slice(0, 300)}`,
    );
  }

  const intent = normalise(raw, warnings);
  return { intent, usage: response.usage, warnings };
}

/**
 * Coerce the model's object into a ParsedIntent we can rely on downstream.
 *
 * Models drop fields, return "2" instead of 2, and occasionally emit a bare string
 * where an object was asked for. Normalising here means ground and build never have to
 * guard, and anything implausible becomes a warning the agent can see rather than a
 * silent default.
 */
function normalise(raw: Record<string, any>, warnings: string[]): ParsedIntent {
  const num = (v: unknown, fallback = 0): number => {
    const n = typeof v === 'string' ? Number(v.replace(/[^\d.-]/g, '')) : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const activities = asArray(raw.activities)
    .map((a) => (typeof a === 'string' ? { name: a } : a))
    .filter((a): a is { name: string; dayNumber?: number; notes?: string } => !!a?.name)
    .map((a) => ({
      name: String(a.name).trim(),
      ...(num(a.dayNumber) > 0 ? { dayNumber: num(a.dayNumber) } : {}),
      ...(a.notes ? { notes: String(a.notes) } : {}),
    }));

  const hotels = asArray(raw.hotels)
    .map((h) => (typeof h === 'string' ? { name: h } : h))
    .filter((h): h is { name: string; roomType?: string; nights?: number } => !!h?.name)
    .map((h) => ({
      name: String(h.name).trim(),
      ...(h.roomType ? { roomType: String(h.roomType) } : {}),
      ...(num(h.nights) > 0 ? { nights: num(h.nights) } : {}),
    }));

  const transfers = asArray(raw.transfers)
    .map((t) => (typeof t === 'string' ? { type: t } : t))
    .filter((t): t is Record<string, any> => !!t)
    .map((t) => {
      const kind = String(t.type ?? '').toLowerCase();
      const type: 'airport' | 'intercity' | 'sightseeing' =
        kind === 'intercity' || kind === 'sightseeing' ? kind : 'airport';
      return {
        type,
        ...(t.route ? { route: String(t.route) } : {}),
        ...(t.vehiclePreference ? { vehiclePreference: String(t.vehiclePreference) } : {}),
      };
    });

  const flights = asArray(raw.flights)
    .filter((f): f is Record<string, any> => !!f?.from && !!f?.to)
    .map((f) => ({ from: String(f.from), to: String(f.to) }));

  const meals = asArray(raw.meals)
    .map((m) => (typeof m === 'string' ? { type: m } : m))
    .filter((m): m is Record<string, any> => !!m?.type)
    .map((m) => ({
      type: String(m.type),
      ...(num(m.dayNumber) > 0 ? { dayNumber: num(m.dayNumber) } : {}),
    }));

  let nights = Math.max(0, Math.round(num(raw.nights)));
  if (nights > 60) {
    warnings.push(`Parsed ${nights} nights, which looks wrong — capped at 60`);
    nights = 60;
  }

  let adults = Math.max(0, Math.round(num(raw.adults)));
  if (adults === 0) {
    adults = 2;
    warnings.push('No adult count stated — assumed 2 adults');
  }

  const destination = String(raw.destination ?? '').trim();
  if (!destination) warnings.push('No destination stated');

  // A day number beyond the trip length can't be honoured; flag it rather than
  // silently dropping the activity onto the wrong day.
  const totalDays = nights + 1;
  for (const a of activities) {
    if (a.dayNumber && a.dayNumber > totalDays) {
      warnings.push(
        `"${a.name}" was placed on day ${a.dayNumber} but the trip is ${totalDays} days — reassigned`,
      );
      delete (a as { dayNumber?: number }).dayNumber;
    }
  }

  return {
    destination,
    nights,
    adults,
    children: Math.max(0, Math.round(num(raw.children))),
    infants: Math.max(0, Math.round(num(raw.infants))),
    ...(raw.travelMonth ? { travelMonth: String(raw.travelMonth) } : {}),
    ...(raw.clientName ? { clientName: String(raw.clientName) } : {}),
    ...(raw.clientPhone ? { clientPhone: String(raw.clientPhone) } : {}),
    activities,
    hotels,
    transfers,
    visa: Boolean(raw.visa),
    flights,
    meals,
    ...(raw.specialRequests ? { specialRequests: String(raw.specialRequests) } : {}),
    ...(raw.budget ? { budget: String(raw.budget) } : {}),
  };
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}
