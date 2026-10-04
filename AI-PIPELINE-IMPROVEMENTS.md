# AI Pipeline Improvement Plan

## Executive Summary

Systematic audit of the four-step AI quotation pipeline (`parse -> ground -> build -> narrate`) revealed **12 loopholes** preventing natural-language prompts from generating correct quotations. All 12 have been implemented.

| ID | Tier | Issue | Status |
|----|------|-------|--------|
| C1 | P0 Critical | Warnings generated but never shown to user | Fixed |
| C2 | P0 Critical | FX rate direction inverted — all USD prices ~13x inflated | Fixed |
| C3 | P0 Critical | Missing INR FX rate crashes flight lines | Fixed |
| C4 | P0 Critical | Travel dates always "today" — travelMonth is dead data | Fixed |
| M1 | P1 Major | Duplicate activities create duplicate lines | Fixed |
| M2 | P1 Major | No sharing vs private distinction for city tours | Fixed |
| M3 | P1 Major | Transfer route matching is unidirectional | Fixed |
| M4 | P1 Major | No quantity field for activities | Fixed |
| P1 | P2 Moderate | Naive activity-to-day spread (round-robin) | Fixed |
| P2 | P2 Moderate | Variant matching lost ("BBQ dinner" ignored) | Fixed |
| P3 | P2 Moderate | No pax-aware vehicle count on transfers | Fixed |
| P4 | P2 Moderate | Child pricing falls back silently to 0.5x | Fixed |

---

## TIER 0 — CRITICAL (P0)

### C1: Warnings Generated but Never Shown to User

**Problem:** The pipeline produces a rich `warnings[]` array (low-confidence matches, missing rates, reassigned days), but `AIGenerator.tsx:25` discards the API response and immediately redirects. `StoredQuotation` had no persistence field for warnings.

**Impact:** The travel agent has no visibility into what the AI guessed, what it couldn't match, or what needs manual attention. Every generated quotation looks "complete" even when half the lines are unpriced placeholders.

**Root Cause:** The redirect fires before the response data is consumed; the schema had no `aiWarnings` field.

**Fix:**
- Added `aiWarnings?: readonly string[]` to `StoredQuotation` in `src/data/schema.ts`
- `build.ts` attaches `aiWarnings` to the quotation literal
- `index.ts` merges all pipeline stage warnings onto the quotation
- `generate.ts` patches `aiWarnings` before saving
- `AIGenerator.tsx` stores warnings in `sessionStorage` before redirect so the editor can display them

**Files changed:** `src/data/schema.ts`, `src/ai/pipeline/build.ts`, `src/ai/pipeline/index.ts`, `src/pages/api/ai/generate.ts`, `src/components/AIGenerator.tsx`

---

### C2: FX Rate Direction Inverted — All USD Prices ~13x Inflated

**Problem:** `build.ts` stored `fx: { AED: '3.65' }`, which the pricing engine interprets as "1 AED = 3.65 USD". The variable `fxAedPerUsd = 3.65` means "3.65 AED per 1 USD" — the opposite direction.

**Impact:** Every AED-denominated line (activities, transfers) was priced at ~13.3x its real value. A 153 AED Desert Safari quoted as USD 558 instead of USD 42.

**Root Cause:** `convertMicros(mu, rate)` in `money.ts:215` *multiplies* by the rate. The engine's FX convention is "1 cost-unit = X quote-units", so `fx[AED]` should be ~0.27 (1 AED = 0.27 USD), not 3.65.

**Fix:** Inverted the rate: `AED: (1 / fxAedPerUsd).toFixed(6)` — produces `'0.273973'`, which correctly converts AED 153 to ~USD 42.

**Files changed:** `src/ai/pipeline/build.ts`

---

### C3: Missing INR FX Rate Crashes Flight Lines

**Problem:** `defaultLineOf('FLIGHT')` in `factories.ts` sets `costCurrency: 'INR'`, but the FX map only contained AED and USD. The pricing engine throws `Missing frozen FX rate INR -> USD` at `engine.ts:206-210`.

**Impact:** Any quotation with a flight line crashes the pricing engine, producing no output at all.

**Root Cause:** `CatalogDefaults` has `fxInrPerUsd` but `build.ts` never read it.

**Fix:** Added `INR: (1 / fxInrPerUsd).toFixed(6)` to the FX map. The rate comes from the catalog defaults sheet (currently ~85.59 INR/USD).

**Files changed:** `src/ai/pipeline/build.ts`

---

### C4: Travel Dates Always "Today" — travelMonth Is Dead Data

**Problem:** The parser extracts `travelMonth` (e.g., "December") but `build.ts` always used `new Date()` for `travelStart`/`travelEnd`.

**Impact:** A "December Dubai trip" generated in October shows October dates on the quotation PDF.

**Root Cause:** No code path consumed `intent.travelMonth`.

**Fix:** Added `monthToDate()` helper that parses month names (with optional year) and picks the next occurrence. `travelStart` now derives from `intent.travelMonth` when available, falling back to today.

**Files changed:** `src/ai/pipeline/build.ts`

---

## TIER 1 — MAJOR (P1)

### M1: Duplicate Activities Create Duplicate Lines

**Problem:** "Burj Khalifa tickets and visit Burj Khalifa" produces two identical priced lines. The dedup in `match.ts` only works within a single `matchProducts` call, not across multiple intent items that resolve to the same catalog row.

**Impact:** The quotation total is inflated by the cost of every duplicate. The client sees repeated line items.

**Fix:** Added catalog-ref deduplication in `build.ts` before building lines. When two grounded activities resolve to the same `catalogRef`, the second is dropped with a warning.

**Files changed:** `src/ai/pipeline/build.ts`

---

### M2: No Sharing vs Private Distinction for City Tours

**Problem:** `matchCityTours` had no type filter. "Private Dubai city tour" matched the cheaper sharing tour because the matcher was type-blind.

**Impact:** Wrong pricing (sharing rate instead of private rate) and wrong service delivered.

**Fix:**
- `matchCityTours` in `match.ts` now accepts `type?: 'sharing' | 'private'`, filters by type, and adds a 0.15 score bonus for type match
- `ground.ts` uses `detectTourType()` to extract "private" or "sharing/shared/group" keywords from the activity name

**Files changed:** `src/catalog/match.ts`, `src/ai/pipeline/ground.ts`

---

### M3: Transfer Route Matching Is Unidirectional

**Problem:** Catalog routes are stored as "Airport to Hotel" but the parser can output "Hotel to Airport". No reverse-route logic existed, so the return leg matched poorly or not at all. Both airport legs also had identical labels.

**Impact:** Return transfers scored low or missed entirely. Both legs were indistinguishable in the quotation.

**Fix:**
- Added `reverseRoute()` helper in `match.ts` that swaps segments around " to "
- `matchTransport` tries the reversed query as fallback at 0.95 score discount
- `build.ts` labels airport transfers as "(Arrival)" and "(Departure)" based on order

**Files changed:** `src/catalog/match.ts`, `src/ai/pipeline/build.ts`

---

### M4: No Quantity Field for Activities

**Problem:** `ParsedIntent.activities` had no `quantity` field. "2 desert safaris" was parsed as a single activity with no count.

**Impact:** Quantities are lost — the quotation shows 1 unit even when the client explicitly asked for multiple.

**Fix:**
- Added `quantity` to the parse type, JSON schema, system prompt instruction, and normaliser
- Threaded through `ground.ts` (onto `GroundedActivity`)
- Applied as `qty` on the built line in `build.ts`

**Files changed:** `src/ai/pipeline/parse.ts`, `src/ai/pipeline/ground.ts`, `src/ai/pipeline/build.ts`

---

## TIER 2 — MODERATE (P2)

### P1: Naive Activity-to-Day Spread

**Problem:** Unpinned activities were spread across sightseeing days using simple round-robin, which could overload one day when activities were added in sequence.

**Fix:** Replaced with min-assignment balancing — each unpinned activity goes to the sightseeing day with the fewest activities assigned so far.

**Files changed:** `src/ai/pipeline/build.ts`

---

### P2: Variant Matching Lost

**Problem:** "Desert Safari with BBQ dinner" — the tokens "bbq" and "dinner" are unknown to the IDF scorer and contribute nothing. A product named "Desert Safari BBQ" should score higher than plain "Desert Safari" but didn't.

**Fix:** Added `unknownTermNameBonus()` in `match.ts` — unknown query terms that appear in the product name (token match: 0.8 bonus, substring: 0.5) contribute a `variantBonus` to the score.

**Files changed:** `src/catalog/match.ts`

---

### P3: No Pax-Aware Vehicle Count

**Problem:** Transfer lines always had `qty: 1` even for 8-person groups exceeding a sedan's capacity.

**Fix:**
- Exported `capacityOf()` from `match.ts`
- `build.ts` computes `Math.ceil(pax / capacityOf(vehicleSize))` and sets `qty` accordingly
- Warns when multiple vehicles are needed

**Files changed:** `src/catalog/match.ts`, `src/ai/pipeline/build.ts`

---

### P4: Child Pricing Falls Back Silently

**Problem:** ~631 Cost Sheet products have no `childCostAed`, so the engine falls back to a 0.5x multiplier. The agent has no way to know which lines use real child rates and which use estimates.

**Fix:** Added a warning in `build.ts` when a product lacks catalog child pricing and the intent includes children.

**Files changed:** `src/ai/pipeline/build.ts`

---

## Verification

All 31 existing tests pass after these changes (pipeline.test.ts: 14/14, match.test.ts: 17/17). The FX rate fix was validated by confirming that `priceQuotation(toEngineInput(quotation))` produces `grandTotal.minor > 0` with no engine errors, and that grounded AED rates stay below 5000 (which would indicate the old minor-units-as-major bug or the FX inflation bug).
