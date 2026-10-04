# Plan: Implement Phase 2 Catalog Features (5 items)

## Context

The QMS quotation editor currently imports supplier rates from a `.xlsx` file via an offline script. Five features need to be built to complete the Phase 2 catalog milestone: live Google Sheets sync, hotel rate catalog, Sanity package templates pull, "start from template" UI, and "duplicate past quote". Together these remove the biggest friction points: agents no longer re-import Excel files manually, hotels get a structured catalog, and creating a new quotation from an existing package or past quote becomes a one-click action.

---

## Implementation Order

1. **Duplicate past quote** — zero external deps, instant win
2. **Google Sheets live sync** — extracts shared normalization logic first
3. **Hotels sheet tab** — extends sync infrastructure from #2
4. **Sanity package pull** — new dependency, builds data layer
5. **Start from a Sanity package** — UI on top of #4

---

## Feature 1: Duplicate Past Quote

**New files:**
- `src/pages/api/quotations/duplicate.ts` — POST endpoint, accepts `{ sourceId }`, deep-clones with `structuredClone`, assigns new `id`/`token`/`reference`/timestamps, resets `status` to `draft`, clears `sentAt`/`firstViewedAt`/`viewCount`, appends ` (copy)` to title, saves via `jsonRepo.save`, returns `{ ok, newId }`

**Modified files:**
- `src/pages/index.astro` — add a Duplicate button per card (after PDF), plus a small inline `<script>` that POSTs to `/api/quotations/duplicate` and redirects to `/edit/{newId}`. No React island needed.

**Reuse:** `newId()`, `newToken()` from `src/data/repo.ts`. Sequential reference generation pattern from `src/pages/new.astro`.

---

## Feature 2: Google Sheets Live Sync

### Step 2a: Extract shared normalization module

**New file:** `src/catalog/normalize.ts`
- Extract from `scripts/import-package-calculator.ts`: `splitTransferOptions`, `stableId`, `toMinorUnits`, `SourceRow` interface, `TRANSFER_LABELS` constant
- Pure functions, no I/O — shareable by xlsx importer and sheets sync

**Modified file:** `scripts/import-package-calculator.ts` — import from `normalize.ts` instead of defining inline

### Step 2b: Google Sheets sync module (dual-path: CSV export + API key)

**New file:** `src/catalog/sheets-sync.ts`

Two fetch paths, same output:

1. **CSV export (default, zero config)** — for sheets shared as "anyone with the link": fetches `https://docs.google.com/spreadsheets/d/{sheetId}/gviz/tq?tqx=out:csv&sheet={tabName}`, parses CSV rows with a lightweight inline parser (no dependency). Works without an API key.

2. **API key path (upgrade for private sheets)** — fetches `https://sheets.googleapis.com/v4/spreadsheets/{sheetId}/values/{range}?key={apiKey}`. Parses the `{ values: string[][] }` JSON response.

The module auto-selects: if `apiKey` is provided in config, use API path; otherwise use CSV export.

- Same column mapping as xlsx importer: A=Location, B=Category, C=Tour, D=Product, E=Transfer, F=AED, G=USD
- Calls shared `splitTransferOptions`, `stableId`, `toMinorUnits` from `normalize.ts`
- Returns `{ products: CatalogProduct[], defaults: CatalogDefaults }`
- Defaults: hardcoded fallbacks (markup 15%, AED/USD 3.65, INR/USD 85.59) since these rarely change; optionally fetched from a Calculator tab if present

### Step 2c: CLI script + API endpoint

**New files:**
- `scripts/sync-catalog.ts` — reads env vars `GOOGLE_SHEETS_API_KEY` and `GOOGLE_SHEET_ID`, calls `fetchCatalogFromSheets`, writes `data/catalog/products.json` + `defaults.json`, logs stats
- `src/pages/api/catalog/sync.ts` — POST endpoint, reads config from `import.meta.env`, calls sync, writes files, calls `_resetCache()` so the running server picks up new data without restart

**Modified files:**
- `.env.local.example` — add `GOOGLE_SHEET_ID=1gEu2lwx835VciZOGC6DZNTpbWkvp9EYM` (required) and `GOOGLE_SHEETS_API_KEY=` (optional — omit for public sheets, the sync uses CSV export)
- `package.json` — add `"sync:catalog": "tsx scripts/sync-catalog.ts"`, add `tsx` as devDep

### Step 2d: Tests

**New file:** `src/catalog/normalize.test.ts`
- `splitTransferOptions`: single label, concatenated labels, empty string
- `stableId`: deterministic, `p_` prefix, 12 hex chars
- `toMinorUnits`: rounding correctness

---

## Feature 3: Hotels Sheet Tab

### Step 3a: Types

**Modified file:** `src/catalog/types.ts` — add:
- `CatalogHotel` interface: `id`, `location`, `hotelName`, `starRating`, `roomType`, `mealPlan`, `ratePerNightAed` (minor units), `season`, `maxOccupancy`, `extraBedRateAed`, `singleSupplementAed`
- `HotelSearchFilters`: `location?`, `starRating?`, `mealPlan?`, `season?`

### Step 3b: Hotel catalog module

**New file:** `src/catalog/hotels.ts`
- Same caching pattern as `catalog.ts`: `loadHotels()`, `searchHotels()`, `hotelFacets()`, `_resetHotelCache()`
- Reads from `data/catalog/hotels.json` (gracefully returns `[]` if file missing)
- Weighted substring search: hotelName=3, roomType=2, location=1

### Step 3c: Extend sync for hotels

**Modified file:** `src/catalog/sheets-sync.ts` — add `fetchHotelsFromSheets(config)`
- Range: `Hotels!A1:K500`
- Expected columns: A=Location, B=Hotel Name, C=Stars, D=Room Type, E=Meal Plan, F=Rate/Night AED, G=Season, H=Max Occupancy, I=Extra Bed Rate, J=Single Supplement
- Gracefully handles missing tab (Sheets API returns 400 → catch, return `[]`, log warning)
- `stableId` key: `[location, hotelName, roomType, mealPlan, season]`

**Modified files:**
- `scripts/sync-catalog.ts` — also call `fetchHotelsFromSheets`, write `data/catalog/hotels.json`
- `src/pages/api/catalog/sync.ts` — also sync hotels, call `_resetHotelCache()`

### Step 3d: Hotel search API + picker

**New files:**
- `src/pages/api/catalog/hotels.ts` — GET endpoint, same shape as `search.ts` but for hotels
- `src/editor/parts/HotelPicker.tsx` — modeled on `CatalogPicker.tsx`, filter chips for Location/Stars/Meal Plan/Season, hits `/api/catalog/hotels`

**Modified file:** `src/editor/parts/LineEditor.tsx`
- Import `HotelPicker`, render it inside HOTEL line's expanded form
- `onPick` maps: `label` = `{hotelName} — {roomType}`, `description` = `{mealPlan} · {season}`, `costCurrency` = AED, pre-fills first room's `roomRate`/`singleSupplement`/`extraBedRate`

### Step 3e: Tests

**New file:** `src/catalog/hotels.test.ts` — search scoring, facets, empty-file handling

---

## Feature 4: Sanity Read-Only Pull

### Step 4a: Install dependency

```
npm install @sanity/client
```

### Step 4b: Types + sync module

**New file:** `src/catalog/package-types.ts`
- `PackageTemplate`: `id` (Sanity `_id`), `numericId`, `slug`, `category`, `title`, `priceInr`, `strikePriceInr?`, `destination`, `duration`, `rating`, `reviews`, `overview`, `highlights[]`, `itinerary` (array of `{dayKey, title, description}`), `inclusions[]`, `exclusions[]`, `hotelInfo?` (`{title?, options?, note?}`), `bannerImage`, `images[]`, `themes[]`, `featured`, `syncedAt`
- Shape derived from `Traverse-Globe/sanity-studio/schemas/package.js` + `index.js`

**New file:** `src/catalog/sanity.ts`
- Creates `@sanity/client` with config from env vars (project `xe1685rk`, dataset `production`, api version `2024-01-01`)
- GROQ query: `*[_type == "package" && active == true]{_id, id, "slug": slug.current, category, title, price, ...}`
- `transformSanityPackage(doc)` → `PackageTemplate`
- `loadPackages()` + `_resetPackageCache()` — same caching pattern as `catalog.ts`, reads from `data/catalog/packages.json`

### Step 4c: CLI script + API endpoint

**New files:**
- `scripts/sync-packages.ts` — reads `SANITY_PROJECT_ID`/`SANITY_DATASET` from env, fetches, writes `data/catalog/packages.json`
- `src/pages/api/catalog/sync-packages.ts` — POST endpoint

**Modified files:**
- `.env.local.example` — add `SANITY_PROJECT_ID=xe1685rk`, `SANITY_DATASET=production`
- `package.json` — add `"sync:packages": "tsx scripts/sync-packages.ts"`

### Step 4d: Tests

**New file:** `src/catalog/sanity.test.ts` — mock `@sanity/client`, verify transform, missing fields default gracefully

---

## Feature 5: Start from a Sanity Package

### Step 5a: Template mapper

**New file:** `src/data/template-mapper.ts`
- `applyTemplate(template: PackageTemplate, base: StoredQuotation): StoredQuotation`
- Maps: `title`, `destination`, `heroImageUrl` (from `bannerImage`), `overview`, `inclusions`, `exclusions`
- Maps itinerary days: each `{ dayKey, title, description }` → `StoredDay` with `title` and `prose`
- Lines are NOT populated (Sanity has website display prices, not supplier costs)

### Step 5b: Templates page

**New file:** `src/pages/templates.astro`
- Lists all cached packages in a card grid with banner image, title, destination, duration, price
- Client-side search filtering via inline `<script>` (no React island)
- Each card links to `/new?template={id}`

### Step 5c: Extend /new

**Modified file:** `src/pages/new.astro`
- Read `template` query param
- If present, load packages, find match, call `applyTemplate` to pre-fill the draft
- Fallback to existing defaults when no template specified

### Step 5d: Navigation

**Modified file:** `src/pages/index.astro` — add "From template" link in the actions bar

### Step 5e: Styles

**Modified file:** `src/styles/app.css` — add `.template-grid`, `.template-card`, `.search-input` styles

### Step 5f: Tests

**New file:** `src/data/template-mapper.test.ts` — verify mapping, empty template, days mapped correctly, lines always empty

---

## Verification

1. **Existing tests pass:** `npm test` — all 78 tests (66 + 12 catalog) must still pass
2. **Duplicate:** click Duplicate on index → new draft opens with copied content, fresh ID/token/reference, status=draft
3. **Sheets sync:** `npm run sync:catalog` → `data/catalog/products.json` output matches xlsx-imported version (same product count, same IDs)
4. **Hotels:** sync runs without error even when Hotels tab doesn't exist (graceful empty); if tab exists, `data/catalog/hotels.json` is created and HotelPicker works in HOTEL lines
5. **Sanity sync:** `npm run sync:packages` → `data/catalog/packages.json` has ~132 packages
6. **Templates:** `/templates` lists packages, clicking one creates a draft pre-filled with title/destination/itinerary/inclusions/exclusions
7. **API sync:** POST `/api/catalog/sync` updates catalog without server restart (cache invalidated)
8. **New tests pass:** all new test files pass via `npm test`
