import type { StoredRoom } from '../../data/schema.js';
import { defaultRoom } from '../factories.js';

/**
 * Room-allocation editor used inside a HOTEL line.
 *
 * Rooms are **explicit allocations**, not derived from pax ÷ 2 — the PRD is firm on
 * this. The agent states what was actually booked (1 double, 1 single + extra bed),
 * and the engine prices exactly that. Single supplements and extra beds are per-row
 * so you can model a mixed group without any arithmetic in your head.
 */

type OccupancyOption = StoredRoom['occupancy'];
const OCCUPANCIES: readonly OccupancyOption[] = ['SINGLE', 'TWIN', 'DOUBLE', 'TRIPLE', 'QUAD'];

interface Props {
  readonly rooms: readonly StoredRoom[];
  readonly onChange: (rooms: StoredRoom[]) => void;
}

export default function RoomsEditor({ rooms, onChange }: Props) {
  const update = (idx: number, patch: Partial<StoredRoom>) => {
    onChange(rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const add = () => onChange([...rooms, defaultRoom()]);
  const remove = (idx: number) => onChange(rooms.filter((_, i) => i !== idx));

  return (
    <div className="rooms">
      <div className="rooms-header">
        <span>Room allocations</span>
        <button type="button" className="btn btn-sm" onClick={add}>
          + Add room
        </button>
      </div>

      {rooms.length === 0 && <div className="rooms-empty">No rooms yet — add at least one.</div>}

      {rooms.map((room, idx) => (
        <div className="room" key={idx}>
          <div className="field-row-2">
            <div className="field">
              <label>Occupancy</label>
              <select
                value={room.occupancy}
                onChange={(e) => update(idx, { occupancy: e.target.value as OccupancyOption })}
              >
                {OCCUPANCIES.map((o) => (
                  <option key={o} value={o}>
                    {o.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label># of rooms</label>
              <input
                type="number"
                min="1"
                value={room.roomCount}
                onChange={(e) => update(idx, { roomCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
            </div>
          </div>

          <div className="field">
            <label>Room rate (per night, in the line&rsquo;s cost currency)</label>
            <input
              value={room.roomRate}
              onChange={(e) => update(idx, { roomRate: e.target.value })}
              placeholder="420.00"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>
                {room.occupancy === 'SINGLE' ? 'Single supplement' : 'Single supplement (unused)'}
              </label>
              <input
                value={room.singleSupplement ?? ''}
                onChange={(e) =>
                  update(idx, { singleSupplement: e.target.value || undefined })
                }
                placeholder="0.00"
                disabled={room.occupancy !== 'SINGLE'}
              />
            </div>
            <div className="field">
              <label>Extra beds</label>
              <input
                type="number"
                min="0"
                value={room.extraBedCount ?? 0}
                onChange={(e) =>
                  update(idx, { extraBedCount: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
              />
            </div>
            <div className="field">
              <label>Extra bed rate</label>
              <input
                value={room.extraBedRate ?? ''}
                onChange={(e) => update(idx, { extraBedRate: e.target.value || undefined })}
                placeholder="0.00"
                disabled={!room.extraBedCount}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Capacity (sleeps)</label>
              <input
                type="number"
                min="0"
                value={room.capacity ?? ''}
                onChange={(e) =>
                  update(idx, {
                    capacity: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                placeholder="2"
              />
            </div>
            <div className="field">
              <label>Pax actually in this room</label>
              <input
                type="number"
                min="0"
                value={room.paxInRoom ?? ''}
                onChange={(e) =>
                  update(idx, {
                    paxInRoom: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
              />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(idx)}>
                Remove room
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
