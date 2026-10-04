import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoredDay, StoredDiscount, StoredLine, StoredQuotation } from '../data/schema.js';
import { paxSummary, toEngineInput, tripDuration } from '../data/schema.js';
import { priceQuotation, PricingError } from '../pricing/engine.js';
import { formatMoney, formatPct } from '../pricing/money.js';
import type { LineType, QuoteResult } from '../pricing/types.js';
import QuotationDocument from '../document/QuotationDocument.js';
import { defaultLineOf, LINE_TYPES, moveItem } from './factories.js';
import DayEditor from './parts/DayEditor.js';
import DiscountEditor from './parts/DiscountEditor.js';
import LineEditor from './parts/LineEditor.js';
import ListEditor from './parts/ListEditor.js';
import { SourcesPanel } from './parts/SourcesPanel.js';
import { ChatPanel } from './parts/ChatPanel.js';
import type { CitationMap } from '../ai/citations.js';
import type { ChatSession, ChatTurn, ProposedChange } from '../ai/chat/types.js';

/**
 * The editor.
 *
 * One React island, owning the mutable quotation. Every mutation goes through a
 * small set of handlers below; the right-hand pane re-renders through the same
 * `<QuotationDocument>` the print route uses, so the preview and the PDF cannot
 * drift. Autosave debounces every 600ms through `/api/quotations/save`.
 */

interface Props {
  readonly initial: StoredQuotation;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ExpandedLines = Readonly<Record<string, boolean>>;

export default function Editor({ initial }: Props) {
  const [q, setQ] = useState<StoredQuotation>(initial);
  const [expanded, setExpanded] = useState<ExpandedLines>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [citations, setCitations] = useState<CitationMap>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession>({
    quotationId: initial.id,
    turns: [],
    provider: 'groq'
  });

  useEffect(() => {
    fetch(`/api/ai/citations/${initial.id}`)
      .then(res => res.json())
      .then(data => setCitations(data))
      .catch(err => console.error('Failed to load citations:', err));

    fetch(`/api/ai/chat/${initial.id}`)
      .then(res => res.json())
      .then(data => setChatSession(data))
      .catch(err => console.error('Failed to load chat:', err));
  }, [initial.id]);

  useEffect(() => {
    if (chatSession.turns.length > 0) {
      fetch('/api/ai/chat/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(chatSession)
      });
    }
  }, [chatSession]);

  const priced = useMemo(() => {
    try {
      return { ok: true as const, result: priceQuotation(toEngineInput(q)) };
    } catch (e) {
      const msg = e instanceof PricingError || e instanceof Error ? e.message : String(e);
      return { ok: false as const, error: msg };
    }
  }, [q]);

  // debounced autosave
  useEffect(() => {
    if (q === initial) return;
    setSaveState('saving');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/quotations/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...q, updatedAt: new Date().toISOString() }),
        });
        if (!res.ok) throw new Error(await res.text());
        setSaveState('saved');
        setSaveError(null);
      } catch (e) {
        setSaveState('error');
        setSaveError(e instanceof Error ? e.message : String(e));
      }
    }, 600);
    return () => clearTimeout(t);
  }, [q, initial]);

  /* ------------- top-level handlers ------------- */

  const update = useCallback(<K extends keyof StoredQuotation>(key: K, value: StoredQuotation[K]) => {
    setQ((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateClient = useCallback((field: 'name' | 'phone' | 'email', value: string) => {
    setQ((prev) => ({ ...prev, client: { ...prev.client, [field]: value } }));
  }, []);

  const updatePax = useCallback((field: 'adults' | 'children' | 'infants', value: number) => {
    setQ((prev) => ({ ...prev, pax: { ...prev.pax, [field]: Math.max(0, value || 0) } }));
  }, []);

  /* ------------- day handlers ------------- */

  const setDays = useCallback((days: StoredDay[]) => {
    setQ((prev) => ({ ...prev, days }));
  }, []);

  // When a day is removed, its lines stay in the quotation but become trip-level —
  // never silently deleted (the agent chose to add them, we don't choose to remove them).
  const orphanLinesForDay = useCallback((dayId: string) => {
    setQ((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.dayId === dayId ? { ...l, dayId: null } : l)),
    }));
  }, []);

  /* ------------- line handlers ------------- */

  const setLines = useCallback((lines: StoredLine[]) => {
    setQ((prev) => ({ ...prev, lines }));
  }, []);

  const addLine = (type: LineType) => {
    const line = defaultLineOf(type);
    setQ((prev) => ({ ...prev, lines: [...prev.lines, line] }));
    setExpanded((prev) => ({ ...prev, [line.id]: true }));
  };

  const updateLine = (id: string, patch: Partial<StoredLine>) => {
    setLines(q.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    if (!confirm('Delete this line? This cannot be undone.')) return;
    setLines(q.lines.filter((l) => l.id !== id));
    setExpanded((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const moveLine = (id: string, direction: 'up' | 'down') => {
    const idx = q.lines.findIndex((l) => l.id === id);
    if (idx === -1) return;
    setLines(moveItem(q.lines, idx, direction));
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ------------- discount handlers ------------- */

  const setDiscounts = useCallback((discounts: StoredDiscount[]) => {
    setQ((prev) => ({ ...prev, discounts }));
  }, []);

  /* ------------- chat handlers ------------- */

  const handleChatSend = async (message: string, provider: string) => {
    const newTurn: ChatTurn = {
      id: Math.random().toString(36).substring(2),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setChatSession(prev => ({
      ...prev,
      provider,
      turns: [...prev.turns, newTurn]
    }));

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          quotationId: q.id,
          message,
          history: [...chatSession.turns, newTurn],
          provider
        })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setChatSession(prev => ({
        ...prev,
        turns: [...prev.turns, {
          id: Math.random().toString(36).substring(2),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          proposedChanges: data.proposedChanges
        }]
      }));
    } catch (err: any) {
      console.error(err);
      alert('AI Chat failed: ' + err.message);
    }
  };

  const handleApplyChange = (change: ProposedChange, turnId: string) => {
    if (change.type === 'add_line' && change.after) {
      // The agent returns a partial line — fill the required scaffolding from the
      // matching defaultLineOf so the pricing engine never sees a half-built row.
      const partial = change.after as Partial<StoredLine>;
      const type = (partial.type as LineType) || 'ACTIVITY';
      const base = defaultLineOf(type, partial.dayId ?? null);
      const merged: StoredLine = { ...base, ...partial, id: partial.id || base.id };
      setQ(prev => ({ ...prev, lines: [...prev.lines, merged] }));
      if (change.citation) {
        setCitations(prev => ({
          ...prev,
          [merged.id]: [...(prev[merged.id] || []), { ...change.citation!, lineId: merged.id }],
        }));
      }
    } else if (change.type === 'update_line' && change.after && change.after.id) {
      updateLine(change.after.id, change.after as Partial<StoredLine>);
      if (change.citation) {
        const lid = change.after.id;
        setCitations(prev => ({
          ...prev,
          [lid]: [...(prev[lid] || []), { ...change.citation!, lineId: lid }],
        }));
      }
    } else if (change.type === 'remove_line' && change.before && change.before.id) {
      setLines(q.lines.filter((l) => l.id !== change.before!.id!));
    } else if (change.type === 'set_field' && change.after) {
      setQ(prev => ({ ...prev, ...(change.after as Partial<StoredQuotation>) }));
    } else if (change.type === 'update_day' && change.after && 'id' in change.after && change.after.id) {
      const dayId = change.after.id as string;
      setQ(prev => ({
        ...prev,
        days: prev.days.map(d => d.id === dayId ? { ...d, ...(change.after as Partial<StoredDay>) } : d),
      }));
    }

    setChatSession(prev => ({
      ...prev,
      turns: prev.turns.map(t => t.id === turnId ? { ...t, applied: true } : t)
    }));
  };

  /* ------------- derived ------------- */

  const { nights, days } = tripDuration(q);

  // Build a quick lookup of priced results per line so the collapsed row shows
  // sell + margin without each sub-component having to re-run the engine.
  const linePricing = useMemo(() => {
    const map = new Map<string, { sell: string; margin: string; marginGood: boolean }>();
    if (!priced.ok) return map;
    for (const l of priced.result.lines) {
      map.set(l.lineId, {
        sell: formatMoney(l.sell, { showDecimals: false }),
        margin: formatMoney(l.margin, { showDecimals: false }),
        marginGood: l.margin.minor >= 0n,
      });
    }
    return map;
  }, [priced]);

  return (
    <div className="editor flex h-screen">
      {/* ====================== LEFT: FORM ====================== */}
      <section className="editor-form flex-1 overflow-y-auto">
        <div className="flex justify-between items-center bg-gray-50 p-2 border-b">
          <SaveBadge state={saveState} error={saveError} />
          <div className="flex gap-2">
            <button className="btn btn-sm bg-purple-100 text-purple-800 font-medium" onClick={() => setChatOpen(!chatOpen)}>
              {chatOpen ? 'Hide Assistant' : '✨ AI Assistant'}
            </button>
            <button className="btn btn-sm bg-blue-100 text-blue-800" onClick={() => setShowSources(!showSources)}>
              {showSources ? 'Hide Sources' : 'Show Sources'}
            </button>
          </div>
        </div>

        {/* ---------- client & trip ---------- */}
        <div className="section-head">Client &amp; trip</div>

        <div className="field">
          <label>Title</label>
          <input value={q.title} onChange={(e) => update('title', e.target.value)} />
        </div>

        <div className="field-row-2">
          <div className="field">
            <label>Destination</label>
            <input value={q.destination} onChange={(e) => update('destination', e.target.value)} />
          </div>
          <div className="field">
            <label>Reference</label>
            <input value={q.reference} onChange={(e) => update('reference', e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Client name</label>
            <input value={q.client.name} onChange={(e) => updateClient('name', e.target.value)} />
          </div>
          <div className="field">
            <label>Client phone</label>
            <input value={q.client.phone ?? ''} onChange={(e) => updateClient('phone', e.target.value)} />
          </div>
          <div className="field">
            <label>Agent</label>
            <input value={q.agentName ?? ''} onChange={(e) => update('agentName', e.target.value)} />
          </div>
        </div>

        <div className="field-row-2">
          <div className="field">
            <label>Travel from</label>
            <input
              type="date"
              value={q.travelStart}
              onChange={(e) => update('travelStart', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Travel to</label>
            <input type="date" value={q.travelEnd} onChange={(e) => update('travelEnd', e.target.value)} />
          </div>
        </div>
        <div className="save-status">
          Derived: {nights} nights / {days} days · {paxSummary(q)}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Adults</label>
            <input
              type="number"
              min="0"
              value={q.pax.adults}
              onChange={(e) => updatePax('adults', parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Children</label>
            <input
              type="number"
              min="0"
              value={q.pax.children}
              onChange={(e) => updatePax('children', parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Infants</label>
            <input
              type="number"
              min="0"
              value={q.pax.infants}
              onChange={(e) => updatePax('infants', parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        {/* ---------- pricing ---------- */}
        <div className="section-head">Pricing</div>
        <div className="field-row-2">
          <div className="field">
            <label>Quote currency</label>
            <select
              value={q.quoteCurrency}
              onChange={(e) =>
                update('quoteCurrency', e.target.value as StoredQuotation['quoteCurrency'])
              }
            >
              <option value="INR">INR</option>
              <option value="AED">AED</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="field">
            <label>AED → INR rate (frozen)</label>
            <input
              value={q.fx.AED ?? ''}
              onChange={(e) => update('fx', { ...q.fx, AED: e.target.value })}
              placeholder="22.85"
            />
          </div>
        </div>

        <div className="field">
          <label>Markup mode</label>
          <select
            value={q.pricingMode}
            onChange={(e) => update('pricingMode', e.target.value as StoredQuotation['pricingMode'])}
          >
            <option value="PER_SERVICE">Per service (recommended)</option>
            <option value="FLAT">Flat % across all lines</option>
            <option value="TARGET_MARGIN">Target margin (coming soon)</option>
          </select>
        </div>

        {q.pricingMode === 'FLAT' && (
          <div className="field">
            <label>Flat markup %</label>
            <input
              type="number"
              value={q.flatMarkupPct ?? 0}
              onChange={(e) => update('flatMarkupPct', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        {q.pricingMode === 'PER_SERVICE' && (
          <div className="field-row">
            {(['HOTEL', 'ACTIVITY', 'TRANSFER'] as const).map((t) => (
              <div className="field" key={t}>
                <label>{t} %</label>
                <input
                  type="number"
                  value={q.defaultMarkupByType?.[t] ?? 0}
                  onChange={(e) =>
                    update('defaultMarkupByType', {
                      ...q.defaultMarkupByType,
                      [t]: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* ---------- days ---------- */}
        <div className="section-head">Day-by-day itinerary</div>
        <DayEditor days={q.days} onChange={setDays} onRemove={orphanLinesForDay} />

        {/* ---------- lines ---------- */}
        <div className="section-head">
          Line items ({q.lines.length})
        </div>
        <div className="line-add-row">
          <span>Add:</span>
          {LINE_TYPES.map((type) => (
            <button
              type="button"
              key={type}
              className="btn btn-sm"
              onClick={() => addLine(type)}
            >
              + {type.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="lines">
          {q.lines.length === 0 && (
            <div className="rooms-empty">No line items yet. Use the buttons above to add one.</div>
          )}
          {q.lines.map((line, idx) => (
            <LineEditor
              key={line.id}
              line={line}
              days={q.days}
              expanded={!!expanded[line.id]}
              priced={linePricing.get(line.id)}
              citations={citations[line.id]}
              onToggle={() => toggleExpand(line.id)}
              onChange={(patch) => updateLine(line.id, patch)}
              onRemove={() => removeLine(line.id)}
              onMove={(direction) => moveLine(line.id, direction)}
              canMoveUp={idx > 0}
              canMoveDown={idx < q.lines.length - 1}
            />
          ))}
        </div>

        {/* ---------- discounts ---------- */}
        <div className="section-head">Discounts</div>
        <DiscountEditor
          discounts={q.discounts ?? []}
          onChange={setDiscounts}
          quoteCurrency={q.quoteCurrency}
        />

        {/* ---------- inclusions / exclusions / terms ---------- */}
        <div className="section-head">Inclusions</div>
        <ListEditor
          value={q.inclusions}
          onChange={(v) => update('inclusions', v)}
          placeholder="One inclusion per line"
          rows={6}
        />

        <div className="section-head">Exclusions</div>
        <ListEditor
          value={q.exclusions}
          onChange={(v) => update('exclusions', v)}
          placeholder="One exclusion per line"
          rows={4}
        />

        <div className="section-head">Payment schedule</div>
        <ListEditor
          value={q.paymentPolicy}
          onChange={(v) => update('paymentPolicy', v)}
          placeholder="One milestone per line, e.g. 50% at confirmation"
          rows={3}
        />

        <div className="section-head">Terms</div>
        <ListEditor
          value={q.terms}
          onChange={(v) => update('terms', v)}
          placeholder="One clause per line"
          rows={4}
        />

        <p className="save-status" style={{ marginTop: 16 }}>
          Changes autosave to <code>data/quotations/{q.id}.json</code>.
        </p>
      </section>

      {showSources && (
        <SourcesPanel citations={citations} quotation={q} onClose={() => setShowSources(false)} />
      )}
      
      {chatOpen && (
        <ChatPanel 
          session={chatSession} 
          onSend={handleChatSend} 
          onApplyChange={handleApplyChange} 
          onClose={() => setChatOpen(false)} 
        />
      )}

      {/* ====================== RIGHT: PREVIEW ====================== */}
      <section className="editor-preview flex-1 overflow-y-auto">
        {priced.ok ? (
          <>
            <MarginPanel priced={priced.result} />
            {priced.result.warnings.length > 0 && (
              <div className="warnings">
                <strong>Warnings</strong>
                <ul>
                  {priced.result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="preview-scaled">
              <QuotationDocument q={q} result={priced.result} />
            </div>
          </>
        ) : (
          <div className="error-banner">
            <strong>Pricing error:</strong> {priced.error}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function SaveBadge({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'idle') return null;
  if (state === 'saving') return <div className="save-status">Saving…</div>;
  if (state === 'saved') return <div className="save-status saved">All changes saved</div>;
  return <div className="error-banner">Save failed: {error}</div>;
}

function MarginPanel({ priced }: { priced: QuoteResult }) {
  const totalFmt = formatMoney(priced.grandTotal, { showDecimals: false });
  const costFmt = formatMoney(priced.totalCost, { showDecimals: false });
  const marginFmt = formatMoney(priced.margin, { showDecimals: false });
  const marginGood = priced.margin.minor > 0n;

  return (
    <div className="margin-panel">
      <div className="cell">
        <div className="label">Total (sell)</div>
        <div className="value">{totalFmt}</div>
      </div>
      <div className="cell">
        <div className="label">Cost</div>
        <div className="value">{costFmt}</div>
      </div>
      <div className="cell">
        <div className="label">Margin ({formatPct(priced.marginPct)})</div>
        <div className={`value ${marginGood ? 'good' : 'bad'}`}>{marginFmt}</div>
      </div>
    </div>
  );
}
