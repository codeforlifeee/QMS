import { formatMoney } from '../pricing/money.js';
import type { QuoteResult } from '../pricing/types.js';
import { paxSummary, tripDuration } from '../data/schema.js';
import type { StoredQuotation } from '../data/schema.js';
import { COMPANY } from '../config/company.js';

/**
 * The quotation document.
 *
 * Rendered server-side with no client directive, so the print route ships zero
 * JavaScript and the HTML Chrome prints is exactly the HTML we generated. The editor
 * preview mounts this same component, which is what makes "the PDF matches the preview"
 * true by construction rather than by careful tuning.
 *
 * This is the client-facing artefact: it shows SELL prices only. Cost, markup and margin
 * never appear here — they live in the agent's panel.
 */

interface Props {
  readonly q: StoredQuotation;
  readonly result: QuoteResult;
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(d.getTime()) ? DATE_FMT.format(d) : iso;
}

export default function QuotationDocument({ q, result }: Props) {
  const { days, nights } = tripDuration(q);
  const billable = result.lines.filter((l) => !l.isOptional);
  const optional = result.lines.filter((l) => l.isOptional);

  const linesByDay = new Map<string, Array<typeof result.lines[0]>>();
  for (const line of result.lines) {
    if (!line.dayId) continue;
    const bucket = linesByDay.get(line.dayId);
    if (bucket) bucket.push(line);
    else linesByDay.set(line.dayId, [line]);
  }

  const money = (m: Parameters<typeof formatMoney>[0]) => formatMoney(m, { showDecimals: false });

  return (
    <div className="doc">
      {/* masthead */}
      <header className="masthead">
        <div>
          <h1 className="brand-name">{COMPANY.name}</h1>
          <p className="brand-tag">{COMPANY.tagline}</p>
        </div>
        <div className="meta">
          <div>
            Quotation <strong>{q.reference}</strong>
          </div>
          <div>Prepared {fmtDate(q.createdAt.slice(0, 10))}</div>
          {q.agentName ? <div>By {q.agentName}</div> : null}
        </div>
      </header>

      {/* hero */}
      <section className="hero">
        {q.heroImageUrl ? (
          <img className="hero-image" src={q.heroImageUrl} alt={q.destination} />
        ) : null}
        <h2 className="hero-title">{q.title}</h2>
        <p className="hero-sub">
          {q.destination} &middot; Prepared for {q.client.name}
        </p>
      </section>

      {/* facts */}
      <section className="facts avoid-break">
        <div className="fact">
          <p className="fact-label">Duration</p>
          <p className="fact-value">
            {nights} Nights / {days} Days
          </p>
        </div>
        <div className="fact">
          <p className="fact-label">Travel dates</p>
          <p className="fact-value">
            {fmtDate(q.travelStart)} – {fmtDate(q.travelEnd)}
          </p>
        </div>
        <div className="fact">
          <p className="fact-label">Travellers</p>
          <p className="fact-value">{paxSummary(q)}</p>
        </div>
      </section>

      {/* headline price */}
      <section className="summary">
        <div>
          <p className="summary-label">Total package cost</p>
          <p className="summary-total">{money(result.grandTotal)}</p>
        </div>
        {result.perPerson ? (
          <div className="summary-per">
            <p className="summary-label">Approx. per person</p>
            <p className="summary-total">{money(result.perPerson)}</p>
          </div>
        ) : null}
      </section>

      {/* overview */}
      {q.overview ? (
        <section className="section">
          <h3 className="section-title">About this trip</h3>
          <p className="lede">{q.overview}</p>
        </section>
      ) : null}

      {/* itinerary */}
      <section className="section">
        <h3 className="section-title">Your day-by-day itinerary</h3>
        {q.days.map((day) => {
          const dayLines = linesByDay.get(day.id) ?? [];
          return (
            <article className="day" key={day.id}>
              <div className="day-no">
                <span>Day</span>
                <strong>{day.index}</strong>
              </div>
              <div className="day-body">
                <h4 className="day-title">{day.title}</h4>
                {day.prose ? <p className="day-prose">{day.prose}</p> : null}
                {dayLines.length > 0 ? (
                  <div className="day-tags">
                    {dayLines.map((l) => (
                      <span className="tag" key={l.lineId}>
                        {l.label}
                        {l.isOptional ? ' (optional)' : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {/* inclusions / exclusions */}
      {(q.inclusions?.length ?? 0) > 0 || (q.exclusions?.length ?? 0) > 0 ? (
        <section className="section">
          <h3 className="section-title">What is and isn&rsquo;t included</h3>
          <div className="panels">
            {q.inclusions?.length ? (
              <div className="panel included">
                <h3>Included</h3>
                <ul>
                  {q.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {q.exclusions?.length ? (
              <div className="panel excluded">
                <h3>Not included</h3>
                <ul>
                  {q.exclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* price breakdown */}
      <section className="section">
        <h3 className="section-title">Price breakdown</h3>
        <table className="prices">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {billable.map((line) => {
              const stored = q.lines.find((s) => s.id === line.lineId);
              return (
                <tr key={line.lineId}>
                  <td>
                    <span className="line-label">{line.label}</span>
                    {stored?.description ? (
                      <span className="line-note">{stored.description}</span>
                    ) : null}
                  </td>
                  <td className="num">{money(line.sell)}</td>
                </tr>
              );
            })}
            {optional.map((line) => (
              <tr className="optional-row" key={line.lineId}>
                <td>
                  <span className="line-label">{line.label}</span>
                  <span className="line-note">Optional &mdash; not included in the total below</span>
                </td>
                <td className="num">{money(line.sell)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span className="num">{money(result.subtotalSell)}</span>
          </div>
          {result.discountTotal.minor > 0n ? (
            <div>
              <span>{q.discounts?.[0]?.label ?? 'Discount'}</span>
              <span className="num">&minus; {money(result.discountTotal)}</span>
            </div>
          ) : null}
          {result.taxTotal.minor > 0n ? (
            <div className="rule">
              <span>{q.taxLabel ?? 'Taxes'}</span>
              <span className="num">{money(result.taxTotal)}</span>
            </div>
          ) : null}
          <div className="grand">
            <span>Total payable</span>
            <span className="num">{money(result.grandTotal)}</span>
          </div>
        </div>
        {result.perPerson ? (
          <p className="per-person-note">
            Approximately {money(result.perPerson)} per person for {result.chargeablePax} travellers.
          </p>
        ) : null}
      </section>

      {/* policy */}
      <section className="section policy avoid-break">
        <h3 className="section-title">Payment &amp; booking terms</h3>
        <div className="panels">
          <div className="panel">
            <h3>Payment schedule</h3>
            <ol>
              {(q.paymentPolicy ?? []).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>
          <div className="panel">
            <h3>Terms</h3>
            <ul>
              {(q.terms ?? []).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
        {q.validUntil ? (
          <p className="validity">
            This quotation is valid until <strong>{fmtDate(q.validUntil)}</strong>. Rates and
            availability are confirmed at the time of booking.
          </p>
        ) : null}
      </section>

      {/* footer */}
      <footer className="doc-footer">
        <div>
          <strong>{COMPANY.name}</strong>
          {COMPANY.indiaAddress}
        </div>
        <div>
          <strong>UAE office</strong>
          {COMPANY.uaeAddress}
        </div>
        <div>
          <strong>Get in touch</strong>
          {COMPANY.website}
          <br />
          +{COMPANY.whatsapp[0]}
        </div>
      </footer>
    </div>
  );
}
