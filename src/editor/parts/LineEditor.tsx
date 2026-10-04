import type { StoredLine, StoredDay, StoredTier, StoredRoom } from '../../data/schema.js';
import type { CurrencyCode } from '../../pricing/money.js';
import type { LineType, TierMode } from '../../pricing/types.js';
import type { CatalogProduct } from '../../catalog/types.js';
import { BASIS_FOR_TYPE, BASIS_LABELS } from '../factories.js';
import RoomsEditor from './RoomsEditor.js';
import CatalogPicker from './CatalogPicker.js';
import { CitationBadge } from './CitationBadge.js';
import type { Citation } from '../../ai/citations.js';

/** Line types where picking from the Rayna catalog makes sense.
 *  - HOTEL skipped: the Cost sheet has no hotel rows (hotels still typed by hand).
 *  - FLIGHT skipped: flight fares aren't in the catalog; always custom. */
const CATALOG_ENABLED_TYPES: readonly LineType[] = ['ACTIVITY', 'TRANSFER', 'VISA', 'MEAL', 'MISC'];

/**
 * Expandable per-line editor.
 *
 * Collapsed: a single compact row showing type · label · sell · margin + a chevron.
 * Expanded: every field the line actually uses. Fields that don't apply to the
 * current basis (nights, qty, rooms) are hidden rather than disabled, so the form
 * stays visually quiet.
 *
 * The line's type is immutable once chosen — swapping a HOTEL to a FLIGHT would
 * invalidate half the fields. If you need to change type, delete and re-add.
 */

interface Props {
  readonly line: StoredLine;
  readonly days: readonly StoredDay[];
  readonly expanded: boolean;
  readonly priced?: { sell: string; margin: string; marginGood: boolean };
  readonly onToggle: () => void;
  readonly onChange: (patch: Partial<StoredLine>) => void;
  readonly onRemove: () => void;
  readonly onMove: (direction: 'up' | 'down') => void;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly citations?: readonly Citation[];
}

const CURRENCIES: readonly CurrencyCode[] = ['INR', 'AED', 'USD', 'EUR', 'GBP'];
const TIER_MODES: readonly TierMode[] = ['MULTIPLIER', 'ABSOLUTE', 'SAME_AS_ADULT', 'FREE'];

export default function LineEditor({
  line,
  days,
  expanded,
  priced,
  onToggle,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  citations,
}: Props) {
  const basisOptions = BASIS_FOR_TYPE[line.type];
  const showNights = line.basis === 'PER_ROOM_NIGHT';
  const showQty = line.basis === 'PER_UNIT';
  const showRooms = line.basis === 'PER_ROOM_NIGHT' || line.basis === 'PER_ROOM';
  const showTiers = line.basis === 'PER_PERSON';

  return (
    <div className={`line-wrap ${expanded ? 'expanded' : ''} ${line.isOptional ? 'optional' : ''}`}>
      {/* ---------- collapsed row ---------- */}
      <div className="line-row">
        <button type="button" className="line-expand" onClick={onToggle} aria-label="Edit line">
          <span className="type-pill">{line.type}</span>
          <span className="line-title">
            {line.label}
            {citations && citations.length > 0 && (
              <CitationBadge citation={citations[0]!} />
            )}
            {line.markupLocked && <span className="line-flag">locked</span>}
            {line.isOptional && <span className="line-flag">optional</span>}
          </span>
          <small className="line-sub">
            {line.adultRate} {line.costCurrency} · {BASIS_LABELS[line.basis]}
          </small>
        </button>

        <div className="line-amount">{priced?.sell ?? '—'}</div>
        <div className={`line-margin ${priced?.marginGood ? '' : 'bad'}`}>
          {priced ? `+${priced.margin}` : ''}
        </div>

        <div className="line-move">
          <button type="button" className="btn-icon" disabled={!canMoveUp} onClick={() => onMove('up')} title="Move up">
            ↑
          </button>
          <button type="button" className="btn-icon" disabled={!canMoveDown} onClick={() => onMove('down')} title="Move down">
            ↓
          </button>
        </div>
      </div>

      {/* ---------- expanded form ---------- */}
      {expanded && (
        <div className="line-body">
          {CATALOG_ENABLED_TYPES.includes(line.type) && (
            <CatalogPicker
              onPick={(product: CatalogProduct) => {
                // Snapshot the catalog values onto the line. The engine always uses
                // adultRate + costCurrency; catalogRef is traceability only.
                onChange({
                  label: product.product,
                  description: product.tour,
                  costCurrency: 'AED',
                  adultRate: (product.costAed / 100).toFixed(2),
                  supplier: product.supplier,
                  catalogRef: product.id,
                });
              }}
            />
          )}

          <div className="field">
            <label>Label (shown to the client)</label>
            <input value={line.label} onChange={(e) => onChange({ label: e.target.value })} />
          </div>

          <div className="field">
            <label>Description (small note under the label on the document)</label>
            <input
              value={line.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value || undefined })}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Day</label>
              <select
                value={line.dayId ?? ''}
                onChange={(e) => onChange({ dayId: e.target.value || null })}
              >
                <option value="">Trip-level (no day)</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.index}: {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priced per</label>
              <select
                value={line.basis}
                onChange={(e) =>
                  onChange({ basis: e.target.value as StoredLine['basis'] })
                }
              >
                {basisOptions.map((b) => (
                  <option key={b} value={b}>
                    {BASIS_LABELS[b]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Cost currency</label>
              <select
                value={line.costCurrency}
                onChange={(e) => onChange({ costCurrency: e.target.value as CurrencyCode })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>
                {line.basis === 'PER_ROOM_NIGHT' || line.basis === 'PER_ROOM'
                  ? 'Base rate (set 0 and use rooms below)'
                  : line.basis === 'PER_GROUP'
                  ? 'Flat amount'
                  : 'Adult rate'}
              </label>
              <input
                value={line.adultRate}
                onChange={(e) => onChange({ adultRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            {showQty && (
              <div className="field">
                <label>Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={line.qty ?? 1}
                  onChange={(e) =>
                    onChange({ qty: Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                />
              </div>
            )}
            {showNights && (
              <div className="field">
                <label>Nights</label>
                <input
                  type="number"
                  min="0"
                  value={line.nights ?? 0}
                  onChange={(e) =>
                    onChange({ nights: Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                />
              </div>
            )}
          </div>

          {/* child & infant tiers */}
          {showTiers && (
            <>
              <TierFields
                label="Child pricing"
                tier={line.child}
                onChange={(t) => onChange({ child: t })}
              />
              <TierFields
                label="Infant pricing"
                tier={line.infant}
                onChange={(t) => onChange({ infant: t })}
              />
            </>
          )}

          {/* hotel rooms */}
          {showRooms && (
            <RoomsEditor
              rooms={line.rooms ?? []}
              onChange={(rooms: StoredRoom[]) => onChange({ rooms })}
            />
          )}

          <div className="field-row">
            <div className="field">
              <label>Markup % (overrides the type default)</label>
              <input
                type="number"
                step="0.1"
                value={line.markupPctOverride ?? ''}
                onChange={(e) =>
                  onChange({
                    markupPctOverride: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="use default"
                disabled={line.markupLocked}
              />
            </div>
            <div className="field">
              <label>Supplier (frozen on this line)</label>
              <input
                value={line.supplier ?? ''}
                onChange={(e) => onChange({ supplier: e.target.value || undefined })}
                placeholder="Rayna Tours"
              />
            </div>
            <div className="field">
              <label>Tax class</label>
              <input
                value={line.taxClass ?? ''}
                onChange={(e) => onChange({ taxClass: e.target.value || undefined })}
                placeholder="standard"
              />
            </div>
          </div>

          <div className="line-flags">
            <label className="flag">
              <input
                type="checkbox"
                checked={!!line.markupLocked}
                onChange={(e) => onChange({ markupLocked: e.target.checked })}
              />
              <strong>Pass through at cost</strong> (locked — no margin applied, typical for flights)
            </label>
            <label className="flag">
              <input
                type="checkbox"
                checked={!!line.isOptional}
                onChange={(e) => onChange({ isOptional: e.target.checked })}
              />
              <strong>Optional</strong> (shown on the document, excluded from the total)
            </label>
          </div>

          <div className="line-actions">
            <button type="button" className="btn btn-sm" onClick={onToggle}>
              Done editing
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={onRemove}>
              Delete line
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- child/infant tier sub-form ---------- */

function TierFields({
  label,
  tier,
  onChange,
}: {
  label: string;
  tier: StoredTier | undefined;
  onChange: (t: StoredTier | undefined) => void;
}) {
  const current = tier ?? { mode: 'FREE' as TierMode };

  return (
    <div className="field-row">
      <div className="field">
        <label>{label}</label>
        <select
          value={current.mode}
          onChange={(e) => onChange({ ...current, mode: e.target.value as TierMode })}
        >
          <option value="MULTIPLIER">% of adult rate</option>
          <option value="ABSOLUTE">Fixed rate</option>
          <option value="SAME_AS_ADULT">Same as adult</option>
          <option value="FREE">Free</option>
        </select>
      </div>
      {current.mode === 'MULTIPLIER' && (
        <div className="field">
          <label>Multiplier (0.5 = half-adult)</label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={current.multiplier ?? ''}
            onChange={(e) =>
              onChange({ ...current, multiplier: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      )}
      {current.mode === 'ABSOLUTE' && (
        <div className="field">
          <label>Rate (same currency as adult)</label>
          <input
            value={current.rate ?? ''}
            onChange={(e) => onChange({ ...current, rate: e.target.value })}
            placeholder="0.00"
          />
        </div>
      )}
    </div>
  );
}
