import type {
  StoredDay,
  StoredDiscount,
  StoredLine,
  StoredRoom,
} from '../data/schema.js';
import type { CurrencyCode } from '../pricing/money.js';
import type { LineType, PricingBasis } from '../pricing/types.js';

/* ---------- ID generators ----------
 * Short, URL-safe, and locally unique. Not cryptographically random — these are
 * internal row keys, not share tokens. */

const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
export const newLineId = (): string => `l_${Date.now().toString(36)}_${rand()}`;
export const newDayId = (): string => `d_${Date.now().toString(36)}_${rand()}`;
export const newRoomId = (): string => `r_${Date.now().toString(36)}_${rand()}`;

/* ---------- Line-type defaults ----------
 * Each line type has a sensible starting shape so the agent can "+ Add VISA" and
 * immediately have a priced line, then tune it. The default currency is AED because
 * most of your supplier rates come from Rayna in AED — override on the line. */

const DEFAULT_CCY: CurrencyCode = 'AED';

export function defaultLineOf(type: LineType, dayId: string | null = null): StoredLine {
  const base = {
    id: newLineId(),
    dayId,
    type,
    label: labelFor(type),
    costCurrency: DEFAULT_CCY,
    adultRate: '0.00',
  };

  switch (type) {
    case 'HOTEL':
      return {
        ...base,
        basis: 'PER_ROOM_NIGHT',
        nights: 1,
        rooms: [defaultRoom()],
      };
    case 'ACTIVITY':
      return {
        ...base,
        basis: 'PER_PERSON',
        child: { mode: 'MULTIPLIER', multiplier: 0.5 },
      };
    case 'TRANSFER':
      return { ...base, basis: 'PER_UNIT', qty: 1 };
    case 'FLIGHT':
      return {
        ...base,
        basis: 'PER_PERSON',
        costCurrency: 'INR',
        child: { mode: 'SAME_AS_ADULT' },
        markupLocked: true, // pass through at cost — standard for air
      };
    case 'VISA':
      return {
        ...base,
        basis: 'PER_PERSON',
        child: { mode: 'SAME_AS_ADULT' },
      };
    case 'MEAL':
      return {
        ...base,
        basis: 'PER_PERSON',
        child: { mode: 'MULTIPLIER', multiplier: 0.5 },
      };
    case 'MISC':
      return { ...base, basis: 'PER_GROUP' };
  }
}

function labelFor(type: LineType): string {
  const titles: Record<LineType, string> = {
    HOTEL: 'New hotel',
    ACTIVITY: 'New activity',
    TRANSFER: 'New transfer',
    FLIGHT: 'New flight',
    VISA: 'New visa',
    MEAL: 'New meal',
    MISC: 'New item',
  };
  return titles[type];
}

export function defaultRoom(): StoredRoom {
  return {
    occupancy: 'TWIN',
    roomCount: 1,
    roomRate: '0.00',
  };
}

export function defaultDiscount(): StoredDiscount {
  return { kind: 'PERCENT', pct: 5, label: 'Discount' };
}

export function newDay(index: number): StoredDay {
  return {
    id: newDayId(),
    index,
    title: `Day ${index}`,
    prose: '',
  };
}

/* ---------- Array moves (used by Day and Line reorder buttons) ----------
 * Immutable swap, returns the original array if the move would go out of bounds —
 * so a disabled-looking button is simply a no-op rather than crashing. */

export function moveItem<T>(arr: readonly T[], from: number, direction: 'up' | 'down'): T[] {
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return [...arr];
  const copy = [...arr];
  const temp = copy[from] as T;
  copy[from] = copy[to] as T;
  copy[to] = temp;
  return copy;
}

/* ---------- Basis options per line type ----------
 * Shown in the "Priced per" dropdown. The engine supports every combination, but
 * most types don't make sense in every basis (an activity is almost never
 * PER_ROOM_NIGHT). We surface only the sensible ones. */

export const BASIS_FOR_TYPE: Readonly<Record<LineType, readonly PricingBasis[]>> = {
  HOTEL: ['PER_ROOM_NIGHT', 'PER_ROOM', 'PER_PERSON'],
  ACTIVITY: ['PER_PERSON', 'PER_GROUP', 'PER_UNIT'],
  TRANSFER: ['PER_UNIT', 'PER_GROUP', 'PER_PERSON'],
  FLIGHT: ['PER_PERSON', 'PER_GROUP'],
  VISA: ['PER_PERSON', 'PER_UNIT'],
  MEAL: ['PER_PERSON', 'PER_GROUP'],
  MISC: ['PER_GROUP', 'PER_PERSON', 'PER_UNIT'],
};

export const BASIS_LABELS: Readonly<Record<PricingBasis, string>> = {
  PER_PERSON: 'Per person',
  PER_ROOM_NIGHT: 'Per room, per night',
  PER_ROOM: 'Per room',
  PER_UNIT: 'Per unit / qty',
  PER_GROUP: 'Flat / per group',
};

export const LINE_TYPES: readonly LineType[] = [
  'HOTEL',
  'ACTIVITY',
  'TRANSFER',
  'FLIGHT',
  'VISA',
  'MEAL',
  'MISC',
];
