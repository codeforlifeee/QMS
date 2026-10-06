import { useRef } from 'react';
import type { StoredDay } from '../../data/schema.js';
import { newDay } from '../factories.js';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * Day list management.
 *
 * `index` is kept consecutive by renumbering on every mutation — the engine doesn't
 * use it, but it drives the "Day 1 / Day 2 /…" labels on the document, so a gap
 * (Day 1, Day 3) would be jarring. Removing a day orphans its lines: they stay in
 * the quotation but become trip-level (dayId = null), which the agent can then
 * reassign from the line editor. Days now use @dnd-kit for pointer+keyboard
 * drag-and-drop reordering.
 */

interface Props {
  readonly days: readonly StoredDay[];
  readonly onChange: (days: StoredDay[]) => void;
  /** Called with the removed day's id so the parent can orphan its lines. */
  readonly onRemove: (dayId: string) => void;
}

export default function DayEditor({ days, onChange, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const daysRef = useRef(days);
  daysRef.current = days;

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

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = daysRef.current;
    const oldIdx = current.findIndex((d) => d.id === active.id);
    const newIdx = current.findIndex((d) => d.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const moved = arrayMove([...current], oldIdx, newIdx).map((d, i) => ({ ...d, index: i + 1 }));
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {days.map((day, idx) => (
            <SortableDayCard
              key={day.id}
              day={day}
              onUpdate={(patch) => update(idx, patch)}
              onDelete={() => {
                if (confirm(`Delete Day ${day.index}? Its lines will become trip-level.`)) {
                  remove(idx);
                }
              }}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableDayCard({
  day, onUpdate, onDelete,
}: {
  day: StoredDay;
  onUpdate: (patch: Partial<StoredDay>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.15)' : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="day-card">
      <div className="day-head">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag Day ${day.index} to reorder`}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'grab',
            padding: 2,
            marginRight: 6,
            color: 'var(--app-muted)',
            touchAction: 'none',
          }}
        >
          <GripVertical size={16} />
        </button>
        <strong>Day {day.index}</strong>
        <div className="line-move" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="btn-icon btn-danger"
            onClick={onDelete}
            title="Delete day"
          >
            ×
          </button>
        </div>
      </div>

      <div className="field">
        <label>Title</label>
        <input value={day.title} onChange={(e) => onUpdate({ title: e.target.value })} />
      </div>

      <div className="field">
        <label>Prose (what the client reads for this day — AI will draft here later)</label>
        <textarea
          rows={3}
          value={day.prose ?? ''}
          onChange={(e) => onUpdate({ prose: e.target.value })}
        />
      </div>
    </div>
  );
}
