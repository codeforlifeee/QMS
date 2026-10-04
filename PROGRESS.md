# QMS — Progress Against the PRD

> See [`PRD.md`](./PRD.md) for the full spec. This checklist tracks what's built, what's
> partial, what's deferred by design, and what's still open.

**Legend:** ✅ done · 🟡 partial · ⬜ not started · ⚡ deferred by Phase · 🧩 blocked / needs input

---

## A. Project setup

- ✅ New Astro + React + TypeScript project in `QMS/`
- ✅ Old `src/`, `server/` etc. moved to `legacy/` with git history preserved
- ✅ `tsconfig.json` strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- ✅ Vitest wired up (`npm test`)
- ✅ Node 20 compatibility (pinned Astro 5, not 7)
- ⬜ Lint / Biome config
- ⬜ CI config (not needed yet — nothing to deploy)

## B. Pricing engine (PRD §6)

### Core types & money (`src/pricing/money.ts`, `types.ts`)
- ✅ `Money` as `{ minor: bigint, ccy: CurrencyCode }`
- ✅ Cross-currency addition throws `CurrencyMismatchError`
- ✅ Integer minor units everywhere, intermediates in **micros** (10⁻⁶ paise/fils)
- ✅ **No floats** in any computation or serialized output (asserted in test)
- ✅ Exact decimal parsing, HALF_UP rounding (`divRoundHalfUp`, `roundToUnit`)
- ✅ `allocate(total, parts)` — largest-remainder, parts sum **exactly** to total
- ✅ FX conversion with 8dp rate
- ✅ `Intl.NumberFormat` display formatting — symbol concatenation banned
- 🟡 `fx_spread_pct` separate from rate — field exists, UI doesn't expose it

### Pipeline (`src/pricing/engine.ts`)
- ✅ Pax context → chargeable pax (infants excluded by default)
- ✅ Line cost in own currency: PER_PERSON, PER_ROOM_NIGHT, PER_ROOM, PER_UNIT, PER_GROUP
- ✅ FX → quote currency (no rounding mid-pipeline)
- ✅ Per-line markup → sell
- ✅ Day rollup (cost / sell / margin per day)
- ✅ Quote rollup (optional lines excluded from totals)
- ✅ Discounts after markup, before tax (ordered, pro-rata across tax classes)
- ✅ Tax per class, on the discounted base
- ✅ Grand total rounded **once**; delta stored as `roundingAdjustment`
- ⬜ Step 10: TCS 206C(1G) `collections[]` outside tax base and margin
- ✅ Per-person via `allocate`, never divide

### Markup modes
- ✅ `PER_SERVICE` — line override ?? default per type
- ✅ `FLAT` — one % across all unlocked lines
- ⬜ `TARGET_MARGIN` — solver (throws "not implemented")

### Tier pricing (child / infant)
- ✅ `MULTIPLIER`, `ABSOLUTE`, `SAME_AS_ADULT`, `FREE` — no hardcoded 0.5
- ⬜ `child_age_band {min, max}` filtering

### Hotel costing
- ✅ Explicit `roomAllocations[]` — pax never divided by 2
- ✅ Single supplement, extra beds, child-no-bed modelled
- ✅ Capacity warning when `paxInRoom > capacity`
- 🟡 Display basis (twin-share vs per-room vs flat) — supported as field, document always shows total + per-person

### Tax (PRD §6 — needs accountant input)
- ✅ `tax_class` per line, rates per class, snapshotted on quote
- ⬜ Built-in India GST **principal** vs **agent/intermediary** regimes
- ⬜ UAE VAT regime (separate code path)
- ⬜ Tax-inclusive support + fixpoint solver
- ⬜ `client_state_code` + `place_of_supply` for CGST/SGST vs IGST split

### Edge cases
- ✅ 0 adults with child-as-multiplier → warning
- ✅ 0 chargeable pax → per-person is `null`, "—" on document, no NaN
- ✅ Infant FREE by default, excluded from per-person head count
- ✅ Discount > subtotal → hard error, never negative total
- ✅ Missing frozen FX rate → hard block (not silent 1:1)
- ✅ Supplier rate deleted → nothing changes (snapshot in line)
- 🟡 Pax changes after lines — per-pax lines recompute; hotel room allocations don't (manual, per PRD)
- ⬜ Draft→send FX refresh banner & lock-on-send
- ⬜ SIC below `min_pax` warning

## C. Data model & persistence (PRD §5)

- ✅ `StoredQuotation` with all header fields, pax, FX snapshot, pricing mode, tax, rounding
- ✅ `StoredLine` with all 7 subtypes (HOTEL / ACTIVITY / TRANSFER / FLIGHT / VISA / MEAL / MISC)
- ✅ `StoredDay` with prose slot
- ✅ `StoredDiscount` (PERCENT / ABS / PER_PERSON)
- ✅ Copy-on-add discipline — nothing on a quote is a live catalog reference
- ✅ JSON repository behind a `QuotationRepo` interface (atomic write-then-rename)
- ✅ `newToken()` — no dots (Sanity rule honoured), unguessable
- ⬜ `quotation_revisions` — immutable snapshot on send, `content_hash`
- ⬜ `catalog_products` table/sync
- ⬜ `catalog_hotels` / `catalog_hotel_rates`
- ⬜ `package_templates` (cached Sanity projection)
- ⚡ Postgres schema (Supabase) — deferred, PRD says Phase 2+ once we leave local

## D. Document & PDF (PRD §4)

- ✅ Single print template `/print/[token]` — server-rendered, **zero client JS**
- ✅ Layout in **millimetres** only, no responsive breakpoints
- ✅ Real paged-media CSS (`@page`, `break-inside: avoid`, `print-color-adjust: exact`)
- ✅ No `position: fixed`, `vh`, `vw`, `backdrop-filter`
- ✅ `<QuotationDocument>` component shared by preview + print (document never drifts)
- ✅ Browser print path at `/print/:token?print=1` as fallback for actual paper
- ✅ **Server-side PDF endpoint `/api/pdf/[token]`** via Puppeteer
  - ✅ `displayHeaderFooter: false` — no time, no URL, no page numbers
  - ✅ `preferCSSPageSize: true` — CSS owns size + margins, no browser rescale
  - ✅ `printBackground: true` — gradients and tints survive
  - ✅ Browser kept warm between requests (~70ms vs ~1s cold)
  - ✅ Content-Disposition filename like `TG-2026-0041-dubai-family-escape.pdf`
- ✅ Vector PDF verified: 12 embedded fonts, selectable text, 1.19 MB, 4 pages
- 🟡 Self-hosted woff2 — PRD said yes; we use a system font stack. Fine (no network race, no download) but means visual exact-match depends on OS fonts
- ✅ Legacy PDF code (`html2canvas`, `jspdf`, `html2pdf.js`, 4 PDF modules) → `legacy/`

## E. Editor & app shell

- ✅ Top shell with brand bar
- ✅ Index page `/` — lists quotations with status pill, reference, pax, headline total
- ✅ `/new` mints a draft with sensible defaults and redirects to edit
- ✅ Editor `/edit/[id]` — structured form + live right-side A4 preview + margin panel
- ✅ Margin panel: Total · Cost · Margin (with `marginPct` label) — agent-only, never on document
- ✅ Per-line sell + margin shown next to each line
- ✅ Autosave on debounce via `/api/quotations/save`
- ✅ Derived fields visible as agent types ("5 nights / 6 days · 2 Adults, 1 Child")
- ✅ Warnings surface in-UI
- 🟡 Line add / remove / reorder in-UI — currently edits via JSON file; toggling `optional` works in-UI
- 🟡 Catalog search / picker in editor — needs Phase 2 catalog first
- ⬜ Discount editor
- ⬜ Hotel room-allocation editor UI
- ⬜ Inclusions / exclusions / terms editor UI (editable via JSON today)

## F. Catalog & templates (PRD §9 — Phase 2)

- ✅ **Package Calculator.xlsx imported** — 523 products across Dubai + Abu Dhabi, 21 categories
  (`data/catalog/products.json`); FX + 15% house markup captured in `data/catalog/defaults.json`
  and used by `/new` to prefill drafts
- ✅ **Catalog search** — scored substring + Location/Category filters
  (`src/catalog/catalog.ts`, 12 tests)
- ✅ **Catalog picker in editor** — typeahead with filter chips, mounted on ACTIVITY,
  TRANSFER, VISA, MEAL, MISC lines; picks snapshot `label` + `description` + `AED cost`
  + `supplier` + `catalogRef` onto the line
- ⚡ Google Sheets → `catalog_products` nightly sync (same `catalog.ts` module,
  different ingest path)
- ⚡ `Hotels` sheet tab for room rates (biggest data gap today — PRD §9)
- ⚡ Sanity read-only pull of the 132 packages into `package_templates`
- ⚡ "Start from a Sanity package" option
- ⚡ "Duplicate past quote" option

## G. AI features (PRD §8 — Phase 3+)

- ⚡ #1 Polish prose (plain prompt + few-shot of your past quotes)
- ⚡ #2 Extract rates from supplier PDF/Excel (JSON schema)
- ⚡ #3 Semantic search over catalog + packages (pgvector)
- ⚡ #4 Draft a full itinerary from a brief (RAG, grounded in retrieved rows)
- ⚡ Diff/accept UI for all AI output
- ⚡ API keys in server only, never browser

## H. Share, tracking, deployment

- ✅ Share page `/q/[token]` with Download PDF + WhatsApp handoff
- ✅ OG tags (title, description, image) for a decent WhatsApp preview
- ⬜ `first_viewed_at` / `view_count` tracking logic (fields exist in schema)
- ⬜ `valid_until` expiry check
- ⬜ Revoke a share link
- ⬜ Passcode gate (deferred — local-only for now; needed before any public deploy)
- ⚡ Deploy to Cloudflare Pages — Phase 1 delivery item, deferred by user ("local first")

## I. Testing & verification (PRD §11)

- ✅ 66 tests passing (`npm test`)
- ✅ Money layer: parse, round, FX, allocate, cross-currency safety, `0.1 + 0.2 == 0.30`
- ✅ Engine invariants 1, 2, 3, 4, 5, 7, 9, 10, 11, 13 — asserted
- ⬜ Invariant 6 (solver round-trip) — solver not implemented
- ⬜ Invariant 8 (revision immutability) — no revision concept
- ⬜ Invariant 12 (tax-inclusive ≡ tax-exclusive) — not supported
- ✅ Golden-file test over the Dubai seed, pinned to the paisa
- 🟡 5 past-quote golden tests — only 1 so far
- ⬜ Property tests (fast-check) for solver round-trip + no-floats
- ✅ PDF: selectable text, embedded fonts, gradients preserved
- ⬜ Visual diff of preview vs PDF (overlay + pixel diff)
- ⬜ Cross-browser PDF test (Chrome vs Edge)
- ⬜ End-to-end: quote a real client, send over WhatsApp, download PDF, confirm totals

## J. Open questions still needing your input (PRD §12)

- 🧩 **Tax regime** — accountant must confirm principal vs agent per product line, GST rate(s), TCS 206C(1G) applicability from the UAE entity, UAE zero-rating
- 🧩 **Hotel rates** — do you have a rate sheet to seed, or is it currently WhatsApp/email?
- 🧩 **Suppliers** — Rayna only, or multiple side-by-side?
- 🧩 **Discount tiers** — reuse the `SmartPricingEngine` tiers from git history, or start fresh?
- 🧩 **Rust pricing engine** — compile to WASM, or stay TS throughout?

---

## Phase status summary

| Phase | PRD scope | Status |
|---|---|---|
| **Phase 1** — thin vertical slice | Pricing engine (PER_SERVICE) · editor · document · PDF · share link · passcode · Cloudflare deploy | **Core done, usable locally.** Missing: full in-editor line management, passcode, deploy (deferred by you) |
| **Phase 2** — catalog | Sheets sync · catalog search · hotels tab · FLAT + TARGET_MARGIN modes | FLAT done. **Catalog, hotels, solver remaining.** |
| **Phase 3** — AI | Prose polish · rate extraction · diff-accept UI | Not started |
| **Phase 4** — intelligence | pgvector search · grounded itinerary draft · Sanity templates · history · revisions · open tracking | Not started |

**You can quote a real client right now** against the engine's current capabilities
(PER_SERVICE markup, mixed-currency lines, correct maths, beautiful PDF). The gaps are
convenience features (catalog picker, line add/remove in UI) and the four big Phase 3/4
deliverables.
