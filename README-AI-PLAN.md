# AI-Powered Natural Language Quotation Maker

Status: **implemented**. This document describes the architecture as built, and why it
differs from the original plan where it does.

---

## What it does

An agent types a trip in plain English:

> "5 night Dubai trip for 2 adults and 1 child. Day 2 Burj Khalifa, day 3 desert
> safari. Dubai city tour. Airport transfers both ways. Need UAE visa.
> Client is Rajesh Mehta."

…and gets back a complete draft quotation with real supplier rates from the catalog,
activities assigned to days, day-by-day copy written, a source citation on every
priced line, and an explicit list of what still needs attention.

---

## Architecture

```
User prompt
     │
     ▼
POST /api/ai/generate
     │
     ├─ 1. PARSE      (LLM, temp 0)   prompt ──────────► ParsedIntent
     │                                 + normalisation, implausible-value warnings
     │
     ├─ 2. GROUND     (pure code)     each item ───────► catalog row + confidence
     │                                 src/catalog/match.ts — IDF-weighted matching
     │
     ├─ 3. BUILD      (pure code)     rows ────────────► StoredQuotation + CitationMap
     │                                 every rate copied from the catalog, never invented
     │
     └─ 4. NARRATE    (LLM, temp 0.7) days ────────────► titles + prose in one call
                                       non-fatal: failure leaves "Day 1" and empty prose
     │
     ▼
{ quotation, citations, warnings, usage, summary }
     │
     ▼
Editor loads it → inline citation badges + Sources panel → ChatPanel for refinement
```

**Two LLM calls, not four.** Only the two ends touch a model. Everything that
determines a *price* is deterministic code reading the catalog.

---

## Three decisions that mattered

### 1. The model never produces a price

The original plan had the BUILD step ask an LLM to emit the whole `StoredQuotation`,
including `adultRate`. That was the single largest source of wrong quotations: the
model produced plausible-looking numbers that corresponded to nothing in the catalog,
and there was no way to tell which figures were real.

BUILD is now pure code. It copies each rate from the catalog row that GROUND matched
and converts it once from the catalog's integer minor units (fils) to the decimal
string the schema stores. Same intent + same catalog always yields the same lines, and
every priced line carries a citation back to its source row.

### 2. Catalog matching needed its own module

`searchCatalog()` in `catalog.ts` requires *every* query term to appear in the record.
That is right for the interactive picker, where the agent types two words and wants
precision. It is wrong for AI grounding, where the query is whatever phrasing the
client used — "Desert Safari with BBQ dinner" has no catalog row containing "bbq", so a
conjunctive match returned **nothing at all**.

`src/catalog/match.ts` is a tolerant, ranked matcher built for grounding:

| Technique | Problem it solves |
|---|---|
| Stopword removal | "visit the Burj Khalifa tickets" → `burj khalifa` |
| IDF term weighting | "Ain **Dubai**" can't score on a word in half a Dubai-only catalog |
| Token-aware presence | "**Ain** Dubai" must not match "Tr**ain**" — the old scorer returned a Safari Park row at full confidence |
| Glued-form matching | "sky dive" reaches "**Skydive** at the Desert dropzone" |
| Unknown-vocabulary discount | A query made mostly of words the catalog never uses is an honest miss, not a loose match |
| Transfer-row penalty | Long airport-route descriptions name half of Dubai; without this, "Sheikh Zayed Grand Mosque" lands on an "Airport Pick up … Sheikh Zayed road" row |
| Cheaper-on-tie | A bare "Burj Khalifa" resolves to the AED 153 standard ticket, not the AED 620 lounge |

Measured against 20 realistic queries: **19 correct, 1 honest miss**. The original
scorer produced 3 hard misses and 4 wrong matches on the same set.

The threshold (`PRODUCT_MATCH_THRESHOLD = 0.45`) deliberately errs high. A rejected
match becomes an explicit "add this manually" warning; an accepted wrong one becomes a
real price on a real line, which an agent skimming the draft can send to a client
without noticing.

### 3. No vector database

~730 products. In-memory IDF-weighted matching runs in single-digit milliseconds with
no external service, no embedding API calls, and no re-indexing when the catalog
changes. See `VECTOR-DB-ANALYSIS.md` for the full reasoning and the upgrade path if the
catalog ever outgrows it.

---

## Catalog data

Two importers, composable in either order (each preserves the other's rows):

```bash
npx tsx scripts/import-package-calculator.ts   # Cost sheet  -> products.json
npx tsx scripts/import-appsheet.ts             # 4 sheets    -> products/transport/city-tours
```

| Source | Rows | Notes |
|---|---|---|
| Package Calculator → `Cost sheet` | 631 | Main product catalog |
| App Sheet → `EXCURSIONS` | 72 | **Only source of child/toddler pricing anywhere** |
| App Sheet → `ADVENTURES` | 32 | Skydive, helicopter, jet ski, dinner-in-the-sky |
| App Sheet → `TRANSPORT` | 166 | Route × vehicle-size matrix, with parking surcharges |
| App Sheet → `CITY TOURS` | 5 | Sharing/private Dubai + Abu Dhabi, with itineraries |

`scripts/lib/xlsx.ts` is a shared zero-dependency xlsx reader. Extracting it fixed a
regex bug in the original importer: a greedy attribute capture let an empty
self-closing cell swallow the *next* cell's value, reported under the wrong column and
with its type attribute lost. That silently dropped **108 products (17% of the Cost
sheet)** and surfaced raw shared-string indices instead of route names.

Transport rates fold the parking surcharge into the line cost — most airport routes
carry one, and omitting it under-quoted every transfer by AED 20–235.

---

## Reliability

- **Retry with backoff** (`src/ai/retry.ts`) on transient provider faults only — rate
  limits, 5xx, socket errors. A bad API key fails immediately rather than making the
  user wait through three identical failures.
- **Tolerant JSON extraction** (`src/ai/json.ts`) recovers from code fences and
  leading prose, which models emit even in JSON mode.
- **Graceful degradation** — narration failure yields plain "Day N" titles and a
  warning, not a failed generation.
- **Input normalisation** — the parser coerces `"2"` → `2`, bare strings → objects,
  caps implausible night counts, assumes 2 adults when unstated (with a warning), and
  reassigns activities pinned beyond the end of the trip.
- **Pricing-engine validation** — every draft is run through `toEngineInput()` +
  `priceQuotation()` before returning; a rejection becomes a warning.

### Warnings are the product

The generation returns a `warnings[]` the editor surfaces. A realistic run:

```
- "Desert Safari with BBQ dinner" matched "Morning Desert Safari"
  with low confidence (55%) — please verify
- No catalog match for "Sheikh Zayed Grand Mosque" — add this line manually
- Hotel "JW Marriott Marquis" needs a rate — no hotel catalog imported yet
- Visa line needs a rate
```

Everything the AI was unsure about is stated. Nothing is silently guessed.

---

## Providers

`AI_PROVIDER` selects the default; the UI dropdown overrides per request.

| Alias | Model | Notes |
|---|---|---|
| `groq` | `llama-3.3-70b-versatile` | Free tier, fastest |
| `openai` | `gpt-4o` | |
| `claude` | `claude-3-5-sonnet-20241022` | |
| `gemini-3.5-flash` | `gemini-3.5-flash` | |
| `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite` | Free tier |

Provider-specific quirks handled in the adapters: Groq and OpenAI reject JSON mode
unless the word "JSON" appears in the prompt (auto-injected) and cannot combine JSON
mode with tools; Gemini's `system_instruction` must be a `Content` object, not a bare
string.

```
AI_PROVIDER=groq
ANTHROPIC_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
```

---

## Chat refinement

`ChatPanel` in the editor runs a ReAct loop (`src/ai/chat/agent.ts`) with one tool,
`search_catalog`. The agent proposes `add_line` / `update_line` / `remove_line` /
`update_day` / `set_field` changes as a diff; nothing is applied until the agent
clicks Apply. Applied changes are scaffolded through `defaultLineOf()` so a partial
proposal can never produce a half-built line the pricing engine chokes on.

The system prompt receives a condensed quotation summary rather than the full JSON, and
states the minor-units convention explicitly so proposed rates come back as decimal
strings.

---

## Files

**Added**
| File | Purpose |
|---|---|
| `src/catalog/match.ts` | IDF-weighted tolerant catalog matching |
| `src/catalog/match.test.ts` | 17 tests pinning the matching behaviours |
| `src/ai/retry.ts` | Transient-fault retry with backoff |
| `src/ai/json.ts` | Tolerant JSON extraction |
| `src/ai/pipeline/narrate.ts` | Merged day titles + prose (one LLM call) |
| `src/ai/pipeline/pipeline.test.ts` | 14 end-to-end tests with a scripted provider |
| `scripts/lib/xlsx.ts` | Shared zero-dependency xlsx reader |
| `scripts/import-appsheet.ts` | EXCURSIONS / ADVENTURES / TRANSPORT / CITY TOURS |

**Removed**
- `src/ai/pipeline/prose.ts` — merged into `narrate.ts`

**Test coverage**: 109 tests passing (31 of them new, covering matching and the pipeline).

---

## Known gaps

- **No hotel catalog.** Hotels come through as placeholder lines at AED 0 with a
  warning. This is the biggest remaining gap — hotels are usually the largest line on
  a quotation.
- **Visa, flights and meals** are placeholders for the same reason.
- **Return transfers** match the same catalog route as the outbound leg; the rate is
  right but the label may need editing.
- **Two sharing city tours** imported without itinerary bullets (they share a
  spreadsheet column with the private tour). Prices are correct.
