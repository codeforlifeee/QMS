import type { StoredDiscount } from '../../data/schema.js';
import { defaultDiscount } from '../factories.js';

/**
 * Discount editor.
 *
 * Discounts are **ordered**: PERCENT ones compound on the running base, ABS and
 * PER_PERSON subtract flat amounts. The engine applies them after markup and before
 * tax (PRD §6), so a "5% off" produces the behaviour the client expects — the tax
 * line goes down too.
 */

interface Props {
  readonly discounts: readonly StoredDiscount[];
  readonly onChange: (next: StoredDiscount[]) => void;
  readonly quoteCurrency: string;
}

export default function DiscountEditor({ discounts, onChange, quoteCurrency }: Props) {
  const add = () => onChange([...discounts, defaultDiscount()]);
  const remove = (idx: number) => onChange(discounts.filter((_, i) => i !== idx));

  const update = (idx: number, patch: Partial<StoredDiscount>) => {
    onChange(
      discounts.map((d, i) => {
        if (i !== idx) return d;
        return { ...d, ...patch } as StoredDiscount;
      }),
    );
  };

  const changeKind = (idx: number, kind: StoredDiscount['kind']) => {
    const existing = discounts[idx];
    if (!existing) return;
    if (kind === 'PERCENT') {
      onChange(discounts.map((d, i) => (i === idx ? { kind, pct: 5, label: existing.label } : d)));
    } else {
      onChange(
        discounts.map((d, i) =>
          i === idx ? { kind, amount: '0.00', label: existing.label } : d,
        ),
      );
    }
  };

  return (
    <div className="discounts">
      <div className="sub-head">
        <span>{discounts.length} discount{discounts.length === 1 ? '' : 's'}</span>
        <button type="button" className="btn btn-sm" onClick={add}>
          + Add discount
        </button>
      </div>

      {discounts.length === 0 && (
        <div className="rooms-empty">No discounts applied.</div>
      )}

      {discounts.map((d, idx) => (
        <div className="discount-row" key={idx}>
          <div className="field-row">
            <div className="field">
              <label>Kind</label>
              <select value={d.kind} onChange={(e) => changeKind(idx, e.target.value as StoredDiscount['kind'])}>
                <option value="PERCENT">% off (compounds)</option>
                <option value="ABS">Flat amount off</option>
                <option value="PER_PERSON">Per person off</option>
              </select>
            </div>

            {d.kind === 'PERCENT' ? (
              <div className="field">
                <label>Percent</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={d.pct}
                  onChange={(e) => update(idx, { pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ) : (
              <div className="field">
                <label>Amount ({quoteCurrency})</label>
                <input
                  value={d.amount}
                  onChange={(e) => update(idx, { amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="field">
              <label>Label (shown on document)</label>
              <input value={d.label} onChange={(e) => update(idx, { label: e.target.value })} />
            </div>
          </div>

          <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(idx)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
