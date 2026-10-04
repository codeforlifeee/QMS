# PRD — QMS (Quotation Maker Service), Traverse Globe

> **Working directory: `C:\Users\LENOVO\Desktop\Project\QMS` only.**
> No file in `Traverse-Globe` is modified by this project. The sole interaction is QMS **reading**
> the 132 Sanity packages, which requires adding the QMS origin to the allowlist in the **Sanity
> dashboard** — a project setting, not a code change in that repo.

## 1. Context

Traverse Globe agents build client quotations by hand today. A first attempt exists in `QMS/`
(~7,560 LOC, 10 commits, 25 Nov – 3 Dec 2025) but was built without a plan. Three structural
defects explain why it is unusable:

1. **The PDF is architecturally broken, not mis-configured.** Four competing PDF implementations
   exist. The client paths screenshot an 1100px-wide *responsive* React tree with html2canvas, then
   force it to 800px (`pdfGenerator.js:305`) or 1000px (`pdfGeneratorUnified.js`), while
   `server/index.js` renders at a third width. They also strip every `linear-gradient` and force
   `font-family: Arial !important`. The template is built almost entirely from gradients, so the
   PDF discards its own design. **No html2canvas tuning fixes this.**
2. **`contentEditable` never syncs back to state.** `EditableQuotationTemplateNew.jsx`
   (1,252 lines) ships hardcoded placeholder content — an Alps/Paris overview, fake testimonials,
   and Unsplash URLs built by arithmetic (`photo-${1505765050516 + index}`) that 404.
3. **Money is wrong.** `formatCurrency` defaults to INR while the template prints
   `AED {formatCurrency(...)}` → literally **"AED ₹ 12,500.00"**, and the INR ₹295 visa fee is
   summed into an AED subtotal. `MARKUP: 5` ("₹5 per item") is never applied — there is **no margin
   logic at all**.

**Outcome wanted:** fast, reliable, beautiful quotations with correct money maths, a client share
link, a pixel-accurate PDF, a searchable catalog, and AI that drafts prose and itineraries.

**Salvage verdict.** Keep `useGoogleSheets.js` (sheet-ingest), `constants/config.js` (company info,
payment policy), the `ui/index.jsx` kit, and — from commit `d89e14a`, which deleted ~2,900 LOC —
the `SmartPricingEngine` discount tiers as *requirements input*. Rebuild: data model,
document/PDF layer, persistence, pricing.

---

## 2. Decisions locked (from Q&A)

| Area | Decision |
|---|---|
| Editing model | Structured typed data is the single source of truth; rich text only in prose slots. The document is a pure function of data. |
| Users | Small team, **no per-user accounts**. One shared passcode gates the app. |
| Deliverable | **Share link + PDF.** |
| Hosting | **Strictly ₹0** infrastructure. |
| Currency | Each line carries its own cost currency. One quote currency. **FX frozen per quotation.** |
| Catalog source | Google Sheets stays the editing surface, synced into a real DB. |
| Premade packages | 132 Sanity packages as **read-only** starting templates. |
| Markup | **Agent picks the mode per quotation** — all three supported. |
| Hotels | **Agent picks the costing mode per line** — all supported. |
| AI | All four features in scope. |
| Approach | **Thin vertical slice first**, then layer. |

---

## 3. Stack decisions

### Your direct questions, answered

**Rust for the backend?** Technically possible (Cloudflare Workers run Rust via WASM with
`workers-rs`; Vercel has a Beta Rust runtime) — **but I recommend against it.** This workload is
I/O-bound: time goes to browser rendering, LLM latency, and Sheets/Sanity/Supabase calls. Rust buys
roughly nothing and costs you the mature JS SDKs for all of them.

**Where Rust genuinely fits, if you want it:** compile the **pricing engine** to WASM and call it
from TypeScript. It is pure arithmetic with zero I/O — exactly where Rust's determinism and
integer-overflow safety are real wins, and it is the one module where a bug costs money. Optional;
TypeScript with integer minor units is sufficient.

**Vercel free tier?** Functions now reach **60s** and the bundle limit rose to **5GB** (June 2026),
so Puppeteer would fit. **But Vercel Hobby prohibits commercial use**, and this is a revenue tool.
Render has the same problem — its free docs say *"Do not use them for production applications."*
Cloudflare's free tier **explicitly permits commercial use**, so the stack is built there.

### The stack

| Layer | Choice | Free-tier reality |
|---|---|---|
| Frontend + share/print pages | **Astro + React islands + TypeScript** | Share and print pages are *documents*; Astro ships zero JS by default → instant mobile load and deterministic print HTML. The editor is one React island, so your React knowledge transfers. (Next.js is the alternative if you prefer React-everywhere.) |
| Hosting | **Cloudflare Pages** | Commercial use allowed. Unlimited bandwidth, 500 builds/mo, no cold start. |
| API / AI proxy / sync | **Cloudflare Workers** | 100k req/day. **10ms CPU/request** — fine for I/O-bound work; chunk the sheet parse to stay under it. |
| Scheduled jobs | **Cron Triggers** | 5 free. Nightly catalog sync + daily Supabase keep-alive. |
| DB + files + vectors | **Supabase** (Postgres, Storage, pgvector) | 500MB DB, 1GB storage. **Free projects pause after 7 days idle and need manual restore** — the daily ping prevents it. |
| AI | **Claude Haiku 4.5** ($1/$5 per Mtok) behind a provider interface | ~**₹100–250/month** at tens of quotes. Gemini Flash free tier is the ₹0 option but rate-limited (15 RPM / 1,500 RPD, cut 50–80% in late 2025). |
| Language | **TypeScript throughout** | A money app without types is how you get `"AED ₹ 12,500.00"`. Non-negotiable. |

**Honest total: ₹0 infrastructure + ~₹100–250/month for AI** (₹0 achievable with Gemini Flash).

---

## 4. The PDF fix

**Principle: one print template, rendered by a real browser print engine, never rasterised.**

A dedicated route `/print/:token` that is:
- **Server-rendered, zero client JS** — deterministic, nothing to hydrate or reflow.
- Laid out in **millimetres**, with **no responsive breakpoints**. A4 = 210×297mm. Fixed physical
  units are why it cannot "misalign".
- Governed by real paged-media CSS:
  ```css
  @page { size: A4; margin: 12mm 12mm 16mm; }
  .section, .day-card { break-inside: avoid; }
  .page-break { break-before: page; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }  /* keeps gradients */
  ```
- Using **self-hosted woff2** (never a CDN — a font race changes line-wrapping and shifts every
  page), awaiting `document.fonts.ready` before printing.
- Free of `position: fixed`, `vh`/`vw`, and `backdrop-filter` — none survive print.

**Primary path (₹0):** load `/print/:token` in a hidden iframe and call `window.print()`. This uses
**Chrome's own print engine**, producing **true vector PDF** — selectable, searchable text, real
gradients, exact fidelity to the preview. Zero cost, zero cold start. Tradeoff: the user picks
"Save as PDF" in the dialog and the filename is browser-controlled.

**Optional upgrade, behind a port:** `PdfRenderer` with `BrowserPrintRenderer` (default) and
`ChromiumRenderer`. For silent one-click download or server-side email attachment later, run
Playwright on an Oracle Cloud Always Free VM (4 ARM cores / 24GB, commercial use permitted) or a
€4/mo Hetzner box and swap the implementation — **no template changes**, because both render the
same route.

**Delete:** `html2canvas`, `jspdf`, `html2pdf.js`, `pdfGenerator.js`, `pdfGeneratorUnified.js`,
`pdfQualityChecker.js`, `PDFEditorModal.jsx`. Four paths become one.

---

## 5. Data model

Postgres. **Rule: catalog → quote is copy-on-add. Nothing on a quotation is a live catalog
reference.** Each line stores priced values plus `catalog_item_id` + `catalog_version` for
traceability only, so repricing or deleting a catalog item can never mutate a quote.

**`quotations`** — `id`, `code`, `revision_no`, `status` (draft|sent|accepted|expired|void),
`token` (unguessable share slug, **no dots**), `selling_entity` (IN|AE), `agent_name`, `client_*`,
`client_state_code`, `place_of_supply`, `travel_start`, `travel_end`, `quote_currency`,
`pax_adults`, `pax_children`, `child_ages int[]`, `pax_infants`,
`pricing_mode` (PER_SERVICE|FLAT|TARGET_MARGIN), `flat_markup_pct`,
`target {kind: PROFIT_ABS|MARGIN_ON_SELL|MARKUP_ON_COST, value}`,
`default_markup_by_service jsonb` (snapshot of org defaults), `tax_regime_id`,
`tax_rates_snapshot jsonb`, `tax_inclusive bool`, `rounding {unit, mode}`,
`fx_mode` (LIVE|LOCKED), `valid_until`, `sent_at`, `first_viewed_at`, `view_count`.

**`fx_snapshots`** — one row per cost currency used: `from_ccy`, `to_ccy`, `rate decimal(18,8)`,
`fx_spread_pct`, `source`, `fetched_at`. Frozen on send.

**`discounts`** — ordered: `kind` (PERCENT|ABS|PER_PERSON), `value`, `label`, `applies_to`
(QUOTE|LINE), `requires_approval`.

**`quotation_days`** — `id`, `day_index`, `title`, `prose` (rich text), `hero_image_url`.
`date` is derived (`travel_start + day_index`).

**`line_items`** — base: `id`, `quotation_id`, `day_id?`, `scope` (DAY|QUOTE — flights/visa are
quote-scoped), `type` (HOTEL|ACTIVITY|TRANSFER|FLIGHT|VISA|MEAL|MISC), `label`, `description`,
`supplier_name_snapshot`, `supplier_ref`, `catalog_item_id?`, `catalog_version?`, `cost_currency`,
**`tax_class`**, `markup_pct`, `markup_abs_minor`, `markup_is_override`, **`markup_locked`**
(pass-through at cost — for flights), **`is_optional`** (excluded from all totals), `sort_order`.
Pax pricing on every type: `adult_rate_minor`, `child_mode` (MULTIPLIER|ABSOLUTE|SAME_AS_ADULT|FREE),
`child_multiplier`, `child_rate_minor`, `child_age_band {min,max}`, `infant_mode`,
`infant_rate_minor`, `infant_occupies_bed`.

Subtype fields: **Hotel** — `hotel_name`, `room_type`, `meal_plan`, `costing_mode`
(PER_ROOM_NIGHT|PER_ROOM|PER_PERSON), `display_basis` (PP_TWIN_SHARE|PER_ROOM|TOTAL), plus
**`room_allocations[]`**: `occupancy` (SINGLE|TWIN|DOUBLE|TRIPLE|QUAD), `room_count`, `adults`,
`children_with_bed`, `children_no_bed`, `infants`, `room_rate_minor`, `single_supplement_minor`,
`extra_bed_count`, `extra_bed_rate_minor`, `capacity`. **Activity** — `ticket_type`, `sharing`
(SIC|PRIVATE), `min_pax`. **Transfer** — `vehicle_type`, `capacity`, `num_vehicles`, `legs`,
`per_vehicle_rate_minor`. **Flight** — `segments[]`, `fare_by_tier`. **Visa** — `visa_type`,
`fee_minor`, `cost_currency` *(this field alone fixes the ₹295-into-AED bug)*.

**Derived, never stored on a live quote:** nights, converted cost, markup amount, line sell, line
margin, day totals, subtotal, tax, grand total, per-person.

**`quotation_revisions`** — written on each send, immutable: `revision_no`, `inputs_json`,
`outputs_json`, `engine_version`, `fx_snapshot`, `tax_snapshot`, `content_hash`, `sent_at`.
Editing a sent quote creates revision *n+1*; revision *n* stays byte-stable forever.

> **Freezing is three layers:** copy-on-add + per-quote FX/tax snapshots + immutable revisions.

**`catalog_products`** — synced from Sheets, mirroring the existing `Rayna_cost` hierarchy
(`location` → `category` → `tour` → `product` variant) plus `transfer_option`, `cost_minor`,
`currency`, `supplier`, `valid_from/to`, `source_row_hash`, `synced_at`, `embedding` (pgvector).

**`catalog_hotels` / `catalog_hotel_rates`** — *entirely new; no hotel data exists today.* Rates:
`room_type`, `meal_plan`, `season_from/to`, `cost_per_room_night_minor`, `currency`,
`max_occupancy`, `extra_bed_cost_minor`, `single_supplement_minor`.

**`package_templates`** — cached projection of the 132 Sanity packages, so starting a quote never
depends on Sanity being reachable.

---

## 6. The calculation engine

A pure, deterministic module with no I/O. Intermediates carried as **integer micros of a minor
unit** (10⁻⁶ paise/fils); money stored as **integer minor units** (`bigint` + ISO code). **No
floats anywhere**, in DB or JSON. A `Money` type that **throws on cross-currency addition**.

### Pipeline (strict order)

```
1. Pax context     A, C (filtered per line's age band), I → chargeable_pax
2. Line cost       in its OWN currency, from the snapshot
                   per-pax:        r_A·A + eff(child)·C + eff(infant)·I
                   PER_ROOM_NIGHT: Σ_rooms[(rate + single_supp + extra_bed·n + child_no_bed·n)·count]·nights
                   PER_ROOM:       same, without ·nights
                   per-vehicle:    rate · vehicles · legs
3. FX              cost_q = cost_c · rate · (1 + fx_spread_pct)      [no rounding]
4. Markup          line_sell = cost_q·(1 + fᵢ) + markup_abs
                   markup_locked lines: line_sell = cost_q
5. Day rollup      cost / sell / margin per day        ← shown live
6. Quote rollup    subtotal_sell, total_cost           (is_optional lines excluded from both)
7. Discounts       applied to subtotal_sell — AFTER markup, BEFORE tax
8. Tax             per tax_class, on the discounted base
9. Grand total     round once; store the delta as an explicit rounding_adjustment
10. Collections    TCS etc. — added after, outside margin and outside the tax base
11. Per-person     allocate, never divide
```

**Why discounts sit after markup and before tax:** a discount reduces the agreed consideration, so
GST/VAT is legally charged on the *discounted* taxable value. Applying it after markup also honours
the agent's literal intent ("5% off the price I quoted") — discounting before markup silently claws
part of it back.

### The three markup modes

All three collapse to a per-line effective percentage `fᵢ`, which is what keeps per-line and
per-day margin well-defined in every mode.

- **PER_SERVICE** — `fᵢ` = line override ?? `default_markup_by_service[type]`. Thin on flights, fat
  on activities.
- **FLAT** — one `f` for every unlocked line. Mathematically identical to applying `f` at the
  subtotal, since `Σcᵢ(1+f) = (Σcᵢ)(1+f)` — **exact, no drift**.
- **TARGET_MARGIN** — solver below returns `f*`, applied like FLAT.

### Target-margin solver

Let `C_v` = Σ cost of markup-eligible lines, `F` = Σ sell of locked lines, `C` = total cost,
`d = Π(1−pᵢ)` for percentage discounts, `A` = total absolute/per-person discounts.
Then `S = F + C_v(1+f)` and `net = S·d − A`.

| Target | Solve |
|---|---|
| Absolute profit `P*` | `f = ((P* + C + A)/d − F)/C_v − 1` |
| Margin on net `m*` | `net = C/(1−m*)`, then `S = (net + A)/d`, `f = (S − F)/C_v − 1` |
| Markup on cost `k*` | `S = C(1+k*)`, `f = (S − F)/C_v − 1` |

Tax-inclusive quotes: solve on the tax-exclusive net with
`r_eff = Σ(base_k·r_k)/Σbase_k`; because `base_k` depends on `f` when tax classes span locked and
eligible lines, **iterate to a fixpoint** (tolerance 1 minor unit, max 20 iterations — converges in
2–3).

**Degenerate cases, all of which must fail loudly rather than produce `Infinity`:**
`C_v = 0` → unsatisfiable; offer to inject a synthetic "Service fee" MISC line of `target_sell − S`.
`d = 0` (100% discount) → reject. `m* ≥ 1` → infinite price; validate `m* ∈ [0, 0.95)`. `f < 0` →
allow with a "below cost" warning; hard-block if any `line_sell < 0`.
Always round `f` to 6dp, **re-run the forward pipeline**, and display the *achieved* margin — never
the requested one.

### Money and rounding

- **Round at exactly four places:** displayed line sell, each tax amount, grand total, per-person
  allocation. Never round intermediates. Never round FX rates to 2dp.
- **HALF_UP** everywhere (commercial/Indian invoicing convention). `rounding.unit` default 1 minor
  unit for AED, nearest ₹1 for INR, optional nearest ₹100 for client-facing totals.
- **The "per-person × pax ≠ total" trap is eliminated structurally**, not papered over:
  `base = floor(total/n)`, `rem = total − base·n`, distribute 1 minor unit to the first `rem` pax
  (largest-remainder). The total is authoritative; per-person is an allocation *of* it. Display
  "Total ₹X for N pax (≈ ₹Y per person)".
- Store FX `rate` at 8dp **plus `fx_spread_pct` separately** — padding margin into the rate destroys
  reconciliation. Reconciling against a Rayna AED invoice uses the untouched `cost_currency` amounts.
- Formatting via `Intl.NumberFormat` from `quote_currency` (`en-IN` for INR). **Symbol
  concatenation is banned** — that is precisely the `"AED ₹ 12,500.00"` bug.
- Expose **both** `margin_pct = margin/sell` and `markup_pct = margin/cost`, distinctly labelled.
  They are different numbers and conflating them loses money. **Tax is never margin.**

### Hotel modes (agent picks per line)

| Mode | Cost basis | Document shows |
|---|---|---|
| `PER_ROOM_NIGHT` + `PP_TWIN_SHARE` **(market default)** | rate × rooms × nights | per person on twin sharing, single supplement itemised |
| `PER_ROOM_NIGHT` + `PER_ROOM` | same | per room per night |
| `PER_PERSON` | rate × chargeable pax × nights | flat per person |

Rooms are **explicit allocations** — the engine never divides pax by 2. Auto-suggest (7 pax → 3 twin
+ 1 single) but store the result. Validate `Σ per-room pax ≤ capacity` as a **warning**, not a block.

### Tax — build as config; **confirm with your accountant before the first invoice**

`GST_RATE: 0.05` is hardcoded today, and you invoice from **both** an Indian and a UAE entity.
Model a pluggable, effective-dated `TaxRegime` resolved from `selling_entity` + per-line
`tax_class`, snapshotted onto the quote. Never a constant.

- **IN, principal** (your own package, single consideration) → tour-operator rate on **gross**,
  ITC-restricted.
- **IN, agent/intermediary** (commission from the DMC) → higher rate on **commission/margin only**.
  A single quote can mix both — hence per-line `tax_class`.
- Distinct classes needed regardless: air ticket (air-travel-agent valuation differs), visa
  facilitation, forex conversion, pure disbursement.
- **TCS u/s 206C(1G)** on overseas tour packages is a **collection, not revenue** — model in
  `collections[]`, outside margin and outside the GST base. Missing this is a compliance risk.
- Store `client_state_code` + `place_of_supply` now so invoices can split CGST+SGST vs IGST later.
- **AE entity:** UAE VAT is a *different* tax that merely happens to also be 5%. Services relating
  to travel outside the UAE may be out of scope or zero-rated, and recoverable input VAT on the DMC
  invoice changes your true cost. Separate regime; do not share code paths with GST beyond the
  interface.

### Invariants to assert in tests

1. `Σ line_sell == subtotal_sell` exactly (integer, zero drift)
2. `grand_total == net + Σtax + rounding_adjustment` exactly
3. `Σ per_person_allocation == grand_total` exactly
4. `margin == sell − cost` at line, day and quote
5. FLAT per-line application ≡ subtotal application, to the minor unit
6. `forward(solve(target)) == target` within 1 minor unit, or reported unsatisfiable
7. Determinism: `recompute(inputs)` bit-identical for a pinned `engine_version`
8. Immutability: a sent revision's `content_hash` is unchanged after mutating the catalog rate, FX
   config, and tax config
9. Cross-currency `Money` addition throws
10. Monotonicity: raising a unit cost never lowers `grand_total`; raising a discount never raises it
11. Boundaries: 0 pax / 0 lines / 0 nights / 0 rooms → zeros, no NaN, no division by zero
12. Tax-inclusive and tax-exclusive encodings of the same deal yield the same `grand_total`
13. No float appears in any serialized output (property test over the JSON)

### Edge cases

| Case | Behaviour |
|---|---|
| Odd room count | Explicit allocations; auto-suggest but store the result. Capacity mismatch warns, never blocks. |
| 0 adults | Allowed as data. Block **send** if any line prices children as a multiple of an adult rate. `chargeable_pax == 0` → per-person is `null`, rendered "—". Never NaN. |
| Infant, no bed | Default FREE, `occupies_bed=false`; excluded from room capacity and from `chargeable_pax`. The per-person basis is printed on the document. |
| 100% discount | `net=0, tax=0, total=0, margin = −total_cost`. Needs approval; solver rejects. Discounts exceeding subtotal → validation error, never a negative total. |
| FX moves draft→send | Draft refreshes with a "rate moved 2.1%" banner; send locks it. Re-opening a sent quote requires explicit FX re-confirmation on the **new** revision. |
| Supplier rate deleted | Nothing changes (copy-on-add). Line shows "rate no longer in catalog"; refresh is explicit and draft-only. |
| Pax changes after lines exist | Per-pax lines recompute (they're formulas). **Hotel room allocations are marked stale, never auto-reallocated** — it's a commercial decision. Show the before/after total diff. |
| SIC below `min_pax` | Warn: switch to private vehicle pricing. |
| Cost currency with no frozen FX row | **Hard block:** "missing AED→INR rate". |

---

## 7. User flow

```
1. New quotation ── from scratch │ from a Sanity package (132) │ duplicate a past quote
2. Header         client, dates → nights/days auto, pax (A/C/I), quote currency, FX (fetched → frozen)
3. Pricing mode   per-service % │ flat % │ target margin
4. Build by day   catalog search (text → semantic) → activity/transfer
                  hotel → room type, rooms, occupancy mode
                  trip-level → flights, visa, insurance
                  ✨ AI drafts the day prose from the items chosen
5. Live preview   right-hand A4 + margin panel (per line / per day / per quote)
6. Review         inclusions, exclusions, terms, payment schedule, validity
7. Publish        share link (WhatsApp) + PDF
8. Track          first opened, view count → follow up
```

**The specific automations that remove effort:** nights/days derived from dates; per-person figures
derived, never typed; catalog costs prefilled and FX-converted; prose drafted by AI; inclusions
auto-assembled from the lines actually added; payment schedule generated from `PAYMENT_POLICY`;
margin computed continuously so no quote is ever sent at a loss.

---

## 8. AI features (all four, sequenced)

| # | Feature | Technique | RAG? |
|---|---|---|---|
| 1 | **Polish prose** — notes → warm on-brand copy | Plain LLM call, few-shot with your best past quotes as style exemplars | **No** |
| 2 | **Extract rates from supplier PDF/Excel** | LLM with a strict JSON schema; agent confirms every row before it enters the catalog | **No** |
| 3 | **Semantic search** — "Bali honeymoon 5N under ₹80k" | Embeddings in **pgvector** over `catalog_products` + `package_templates` | Retrieval only |
| 4 | **Draft a full itinerary from a brief** | Retrieve candidates via #3, then generate the day plan **constrained to those retrieved rows** | **Yes, true RAG** |

**Your "RAG or something else?" answered:** only #3 and #4 need retrieval. #1 and #2 — the highest
value per working day — are plain prompts and should ship first. #4 **must** be grounded in
retrieved catalog rows; an unconstrained LLM invents hotels and prices, which is worse than useless
inside a priced document.

**Guardrails:** AI never writes to price fields — it drafts prose and *suggests* line items the
agent accepts. All output lands in a diff/accept UI. API keys live only in the Worker, never the
browser.

---

## 9. Catalog, packages, share links

**Sheets → catalog sync.** A nightly Cron Trigger reads the `Rayna_cost` tab (port the existing
`useGoogleSheets.js` parse logic into the Worker), hashes each row, upserts changes into
`catalog_products`. You keep editing rates in Sheets; the app adds search, history, and hotels. Rows
removed from the sheet are **soft-deleted** so existing quotes keep working.
⚠️ Sheet ID `1gEu2lwx835VciZOGC6DZNTpbWkvp9EYM` is committed in `src/constants/config.js:3` and is
permanently in git history — **rotate to a new sheet** and keep the ID in an env var.

**Hotels are the biggest data gap** — no hotel rates exist anywhere today. Add a `Hotels` tab to the
same workbook (room types, seasonal rates, supplements); it syncs through the same pipeline.

**Sanity packages, read-only.** A Worker pulls the 132 packages into `package_templates` nightly.
QMS never writes to Sanity. Add the QMS origin to the Sanity CORS allowlist via the Sanity
dashboard. Note the **no-dots-in-`_id`** rule for that dataset (public read is granted via
`_id in path("*")`, which matches single-segment ids only).

**Share links.** `/q/:token` — server-rendered Astro: fast on mobile, proper OG tags so the WhatsApp
preview shows the destination image and headline price, and a "Download PDF" button triggering the
print path. Token unguessable, link revocable, `valid_until` expires it. Open tracking writes
`first_viewed_at` / `view_count`.

---

## 10. Delivery plan

**Phase 1 — thin vertical slice (the only phase required before you can use it).**
New Astro+TS project in `QMS/`. Supabase schema. Pricing engine + tests (PER_SERVICE mode only).
Structured editor form. One beautiful A4 document component. `/print/:token` + `window.print()`.
`/q/:token` share page. Passcode gate. Deploy to Cloudflare Pages.
*Exit criterion: you quote a real client end-to-end and the PDF is indistinguishable from the preview.*

**Phase 2 — catalog.** Sheets sync Worker + nightly cron. Catalog search. Hotels tab + room
occupancy modes. Remaining markup modes (FLAT, target-margin solver).

**Phase 3 — AI.** Worker AI proxy. Prose polish (#1). Rate extraction (#2). Diff/accept UI.

**Phase 4 — intelligence.** pgvector embeddings, semantic search (#3), grounded itinerary drafting
(#4). Sanity templates. History, duplicate, revisions. Open tracking.

**Out of scope for now:** payments/booking conversion, invoicing, supplier POs, per-user accounts
and roles, a mobile app.

---

## 11. Verification

**Pricing engine (highest risk).** Unit tests for all 13 invariants in §6. Golden-file tests: 5 real
past quotations, hand-computed totals, asserted to the paisa. Property tests over random
pax/rate/markup/discount/tax combinations for `sell − cost == margin`, solver round-trip, and
no-floats-in-output.

**PDF fidelity (the #1 complaint).** Render a 3-day and a 10-day quote. Assert: text is
**selectable** (proves vector, not raster); gradients present; no element straddles a page boundary;
page count stable across Chrome and Edge; fonts correct with the network throttled. Then overlay a
screenshot of the web preview against the PDF page and diff — they should match within antialiasing.

**End-to-end.** Quote a real client: Sanity package → add catalog activity + hotel → set markup →
AI-draft prose → publish → open the WhatsApp link on a real phone → download the PDF → confirm
totals match the margin panel exactly.

**Free-tier guards.** Confirm the Supabase keep-alive cron prevents the 7-day pause; confirm the
sheet-sync Worker stays under 10ms CPU (chunk if not); confirm Worker requests/day sit far below 100k.

---

## 12. Open questions for you

1. **Tax (blocking before the first real invoice).** Which entity invoices which client; are you
   **principal or agent** per product line; current rates; whether **TCS 206C(1G)** applies when the
   UAE entity invoices an Indian resident; and UAE zero-rating / input-VAT recoverability on Rayna
   invoices. Your accountant must confirm — I have modelled all of it as config, not assumptions.
2. **Hotel rates** — do you have a rate sheet to seed `catalog_hotels`, or is it currently in
   WhatsApp/email with suppliers?
3. **Suppliers** — is Rayna the only one, or do several need side-by-side comparison?
4. **Discount tiers** — reuse the deleted `SmartPricingEngine` tiers (group-size 0/5/10/15/20%,
   early-bird 10%, honeymoon 8%, family 10%) as the starting rules, or define fresh?
5. **Rust** — pricing engine as a Rust→WASM module (§3), or TypeScript throughout?
