import type { StoredDay } from '../../data/schema.js';
import { newDay, moveItem } from '../factories.js';

/**
 * Day list management.
 *
 * `index` is kept consecutive by renumbering on every mutation — the engine doesn't
 * use it, but it drives the "Day 1 / Day 2 /…" labels on the document, so a gap
 * (Day 1, Day 3) would be jarring. Removing a day orphans its lines: they stay in
 * the quotation but become trip-level (dayId = null), which the agent can then
 * reassign from the line editor.
 */

interface Props {
  readonly days: readonly StoredDay[];
  readonly onChange: (days: StoredDay[]) => void;
  /** Called with the removed day's id so the parent can orphan its lines. */
  readonly onRemove: (dayId: string) => void;
}

export default function DayEditor({ days, onChange, onRemove }: Props) {
  const update = (idx: number, patch: Partial<StoredDay>) => {
    onChange(days.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const add = () => {
    onChange([...days, newDay(days.length + 1)]);
  };

  const remove = (idx: number) => {
    const removed = days[idx];
    if (!removed) return;
    const next = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, index: i + 1 }));
    onChange(next);
    onRemove(removed.id);
  };

  const move = (idx: number, direction: 'up' | 'down') => {
    const moved = moveItem(days, idx, direction).map((d, i) => ({ ...d, index: i + 1 }));
    onChange(moved);
  };

  return (
    <div className="days">
      <div className="sub-head">
        <span>{days.length} day{days.length === 1 ? '' : 's'}</span>
        <button type="button" className="btn btn-sm" onClick={add}>
          + Add day
        </button>
      </div>

      {days.length === 0 && (
        <div className="rooms-empty">No days yet — add one to start building the itinerary.</div>
      )}

      {days.map((day, idx) => (
        <div className="day-card" key={day.id}>
          <div className="day-head">
            <strong>Day {day.index}</strong>
            <div className="line-move">
              <button type="button" className="btn-icon" disabled={idx === 0} onClick={() => move(idx, 'up')} title="Move up">
                ↑
              </button>
              <button
                type="button"
                className="btn-icon"
                disabled={idx === days.length - 1}
                onClick={() => move(idx, 'down')}
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn-icon btn-danger"
                onClick={() => {
                  if (confirm(`Delete Day ${day.index}? Its lines will become trip-level.`)) {
                    remove(idx);
                  }
                }}
                title="Delete day"
              >
                ×
              </button>
            </div>
          </div>

          <div className="field">
            <label>Title</label>
            <input value={day.title} onChange={(e) => update(idx, { title: e.target.value })} />
          </div>

          <div className="field">
            <label>Prose (what the client reads for this day — AI will draft here later)</label>
            <textarea
              rows={3}
              value={day.prose ?? ''}
              onChange={(e) => update(idx, { prose: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
