# Plan: Built-in CRM & Lead Management — Replace AppSheet

## Context

Traverse Globe currently uses Google AppSheet (paid) on top of a Google Sheet to manage their lead-to-quotation lifecycle:

1. **Meta Ads** run → leads auto-populate Google Sheet (`reel_43000` tab)
2. Key columns imported to an `appsheet` tab
3. AppSheet UI provides: call tracking, lead pipeline (6 buckets), call response forms, follow-up scheduling
4. Manually create quotations in the QMS when a lead is qualified

**The problem:** AppSheet is paid and disconnected from the QMS. The user wants an end-to-end solution built directly into the QMS: **Meta → Lead → Call → Quotation → Send**, all in one app.

**Current QMS state:** Astro 5 + React SSR, JSON file storage, no auth, no database, no CRM. The existing `QuotationRepo` interface and schema comment already anticipate Supabase migration.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | **Supabase** (hosted Postgres) | Free tier, built-in auth, real-time, Row Level Security, the PRD already names it |
| Hosting | **Vercel** | Free tier, Astro SSR adapter available, auto-deploy from GitHub |
| Auth | **Simple passcode gate** | Single user, no RBAC needed. Supabase's `anon` key + app-level passcode |
| Lead ingestion | **Google Sheet sync + webhook** | Sheet sync imports existing leads; webhook endpoint for future direct Meta integration |
| Quotation storage | **Migrate from JSON files to Supabase** | Single source of truth for both leads and quotations |
| UI layout | **Unified dashboard** | Leads pipeline at top, quotations below, single-page overview |
| WhatsApp | **wa.me template links** | Pre-filled messages with customer name, destination, quote link. No API needed |
| PDF rendering | **Keep Puppeteer for now** | Vercel serverless has limits; can move to Cloudflare Browser Rendering later |

## Data Model (Supabase Tables)

### Table: `leads`
Maps to the AppSheet `input` table. Source of truth for all customer leads.

```sql
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT UNIQUE,          -- ID from Google Sheet (dedup key)
  date          TIMESTAMPTZ DEFAULT now(),
  customer_name TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  city          TEXT,
  travelling_month TEXT,
  planning_with TEXT,
  pax_summary   TEXT,                 -- "number_of_adults_and_child_(below_9)?"
  special_arrangements TEXT,
  priority_bucket TEXT DEFAULT 'Untouched Leads'
    CHECK (priority_bucket IN ('Untouched Leads','Call Not Connected','In Progress','My Hot','Warm Lead','Rejected')),
  latest_status TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### Table: `call_responses`
Maps to the AppSheet `output` table. Each row is one call attempt/response.

```sql
CREATE TABLE call_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  call_date_time    TIMESTAMPTZ DEFAULT now(),
  called_by         TEXT,
  call_status       TEXT CHECK (call_status IN (
    'Call not connected','Talk in Progress',
    'Traveler will finalise and is My Hot','Warm Lead',
    'Won''t book with me/ Rejected'
  )),
  call_progress     TEXT,
  wa_status         TEXT CHECK (wa_status IN ('WA Sent','WA Not sent')),
  destination_city  TEXT,
  travel_date       DATE,
  total_adults      INTEGER DEFAULT 0,
  total_children    INTEGER DEFAULT 0,
  child_ages        TEXT[],
  total_nights      INTEGER DEFAULT 0,
  hotel_category    TEXT CHECK (hotel_category IN ('3 Star','4 Star','5 Star')),
  visa              TEXT CHECK (visa IN ('Yes','No')),
  flights           TEXT CHECK (flights IN ('Yes','No')),
  transfers_type    TEXT CHECK (transfers_type IN ('Private Transfers','Sharing Transfers')),
  requirements      TEXT,
  remarks           TEXT,
  budget            TEXT CHECK (budget IN ('Affordable','Medium','Premium','Luxury')),
  next_follow_up    DATE,
  wa_link           TEXT,
  quote_link        TEXT,
  lead_source       TEXT,
  priority          TEXT CHECK (priority IN ('P1','P2','P3')),
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### Table: `quotations`
Migrate existing `StoredQuotation` from JSON files. Add `lead_id` FK.

```sql
CREATE TABLE quotations (
  id            TEXT PRIMARY KEY,       -- existing q_xxx IDs
  token         TEXT UNIQUE NOT NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'draft',
  reference     TEXT,
  data          JSONB NOT NULL,         -- full StoredQuotation object
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

**Design note:** Store the full `StoredQuotation` as JSONB in `data` column. This preserves the existing schema exactly and avoids a massive table with 40+ columns. The indexed columns (`id`, `token`, `lead_id`, `status`, `reference`) enable fast lookups. The existing `toEngineInput()` conversion works unchanged.

### Table: `citations` and `chat_sessions`
```sql
CREATE TABLE citations (
  quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
  data         JSONB NOT NULL
);

CREATE TABLE chat_sessions (
  quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
  data         JSONB NOT NULL
);
```

## Implementation Phases

### Phase 1: Supabase Foundation
**Goal:** Set up database, migrate storage layer, keep everything working.

1. Install `@supabase/supabase-js`
2. Create `src/data/supabase.ts` — Supabase client singleton using env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
3. Create `src/data/supabaseRepo.ts` — implement `QuotationRepo` interface backed by Supabase
4. Create SQL migration files in `supabase/migrations/` for all tables
5. Add migration script `scripts/migrate-json-to-supabase.ts` to move existing 10 quotations
6. Update `repo.ts` to export `supabaseRepo` when env vars are present, fall back to `jsonRepo`
7. Add `.env` entries: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

**Key files:**
- NEW: `src/data/supabase.ts`, `src/data/supabaseRepo.ts`
- NEW: `supabase/migrations/001_initial.sql`
- NEW: `scripts/migrate-json-to-supabase.ts`
- MODIFY: `src/data/repo.ts` (add conditional export)

### Phase 2: Lead Management Backend
**Goal:** CRUD API for leads and call responses, Google Sheet sync.

1. Create `src/data/leadSchema.ts` — TypeScript types for `Lead`, `CallResponse`
2. Create `src/data/leadRepo.ts` — Supabase-backed repository for leads + call responses
3. API routes:
   - `GET /api/leads` — list leads with filtering by priority_bucket
   - `GET /api/leads/[id]` — single lead with call history
   - `POST /api/leads` — create lead (manual entry)
   - `PUT /api/leads/[id]` — update lead (change bucket, etc.)
   - `POST /api/leads/[id]/calls` — create call response
   - `POST /api/leads/sync` — Google Sheet sync endpoint
   - `POST /api/leads/webhook` — Meta webhook receiver
4. Google Sheet sync logic:
   - Read from the `appsheet` tab using Google Sheets API v4
   - Upsert by `external_id` (the ID column from the sheet)
   - Map columns: `Customer Name` → `customer_name`, `Phone` → `phone`, etc.
   - Auto-derive `priority_bucket` from `Latest Status` / `Priority Bucket` column
5. Auto-update `priority_bucket` when call_status changes:
   - "Call not connected" → "Call Not Connected"
   - "Talk in Progress" → "In Progress"
   - "Traveler will finalise and is 'My Hot'" → "My Hot"
   - "Warm Lead" → "Warm Lead"
   - "Won't book with me/ Rejected" → "Rejected"

**Key files:**
- NEW: `src/data/leadSchema.ts`, `src/data/leadRepo.ts`
- NEW: `src/pages/api/leads/index.ts`, `src/pages/api/leads/[id].ts`
- NEW: `src/pages/api/leads/[id]/calls.ts`
- NEW: `src/pages/api/leads/sync.ts`, `src/pages/api/leads/webhook.ts`
- NEW: `src/lib/sheetSync.ts` — Google Sheets API read + transform logic

### Phase 3: CRM UI Components
**Goal:** Build the lead pipeline view, lead detail, and call response form.

1. **Pipeline View** (`src/crm/PipelineView.tsx`)
   - 6 columns matching AppSheet slices: Untouched | Call Not Connected | In Progress | My Hot | Warm Lead | Rejected
   - Each card: customer name, phone, city, travelling month, last call status
   - Click card → expand to lead detail
   - Drag-drop between columns to change bucket (or dropdown)
   - Count badge per column
   - Filter by date range, search by name/phone

2. **Lead Detail Panel** (`src/crm/LeadDetail.tsx`)
   - Lead info card (name, phone, email, city, travelling month, pax, arrangements)
   - Call history timeline (most recent first)
   - Action buttons: New Call, Generate Quote, Create Quote, WhatsApp
   - Linked quotations list

3. **Call Response Form** (`src/crm/CallResponseForm.tsx`)
   - Modal/slide-over form matching all AppSheet fields:
     - Customer Name (pre-filled), Phone (pre-filled)
     - Call Date & Time (default: now)
     - Call Status (dropdown: 5 options matching AppSheet)
     - Call Progress (dropdown)
     - WA Status (toggle: WA Sent / WA Not sent)
     - Destination City (text)
     - Travel Date (date picker)
     - Total Adults, Total Children (number with +/-)
     - Child Ages (tag input)
     - Total Nights (number with +/-)
     - Hotel Category (segment: 3/4/5 Star)
     - Visa, Flights (segment: Yes/No)
     - Transfers Type (segment: Private/Sharing)
     - Requirements / Preferences (textarea)
     - Remarks / Takeaways (textarea)
     - Budget (segment: Affordable/Medium/Premium/Luxury)
     - Next Follow-up Date (date picker)
     - Lead Source (dropdown)
     - Priority (segment: P1/P2/P3)
   - On save: POST to `/api/leads/[id]/calls`, auto-update lead bucket

4. **WhatsApp Template Links** (`src/lib/whatsapp.ts`)
   - `generateWALink(phone, template, vars)` — builds `https://wa.me/{phone}?text={encoded}`
   - Templates: "greeting", "quote_ready", "follow_up"
   - Example: "Hi {name}! Your travel quotation for {destination} is ready. View it here: {link}"

**Key files:**
- NEW: `src/crm/PipelineView.tsx`, `src/crm/LeadDetail.tsx`, `src/crm/CallResponseForm.tsx`
- NEW: `src/lib/whatsapp.ts`
- NEW: `src/styles/crm.css`

### Phase 4: Unified Dashboard & Integration
**Goal:** Merge leads and quotations into one dashboard. Connect lead → quotation flow.

1. **Redesign `index.astro`** — unified dashboard:
   - Top: Stats bar (total leads, by bucket, follow-ups due today)
   - Middle: `<PipelineView>` React island showing lead pipeline
   - Bottom: Recent quotations list (existing, but enhanced with lead links)
   - Sync button (triggers Google Sheet import)

2. **Lead → Quotation bridge:**
   - "Quick Generate" button on lead detail:
     - Builds a natural language prompt from call response data:
       `"{destination_city} trip, {total_nights} nights, {total_adults} adults, {total_children} children, {hotel_category} hotel, {transfers_type}, budget: {budget}. Requirements: {requirements}"`
     - Sends to existing `/api/ai/generate` pipeline
     - Saves with `lead_id` FK
   - "Custom Quote" button:
     - Creates a new quotation pre-filled from lead/call data:
       - `client.name` ← lead.customer_name
       - `client.phone` ← lead.phone
       - `client.email` ← lead.email
       - `destination` ← call.destination_city
       - `pax.adults` ← call.total_adults
       - `pax.children` ← call.total_children
       - `travelStart` ← call.travel_date
       - nights ← call.total_nights
     - Redirects to `/edit/[id]`
   - When quotation is created from a lead, store `lead_id` on the quotation
   - Show linked quotations on the lead detail card

3. **Follow-up tracking:**
   - Dashboard stat: "X follow-ups due today"
   - Visual indicator on leads with overdue follow-ups
   - Sort/filter by next_follow_up date

### Phase 5: Deployment Setup
**Goal:** Deploy to Vercel with Supabase.

1. Switch Astro adapter from `@astrojs/node` to `@astrojs/vercel`
2. Update `astro.config.mjs`
3. Add Vercel-specific config (`vercel.json` if needed)
4. Set environment variables in Vercel dashboard
5. PDF generation: either use Vercel's Chromium layer or keep a separate PDF service
6. Add `GOOGLE_SHEETS_API_KEY` env var for Sheet sync
7. Configure Supabase project with the migration SQL

**Key files:**
- MODIFY: `astro.config.mjs` (adapter swap)
- MODIFY: `package.json` (add `@astrojs/vercel`, `@supabase/supabase-js`, `googleapis`)
- NEW: `vercel.json` (if needed for serverless function config)

## Files Summary

### New files to create
| File | Purpose |
|------|---------|
| `src/data/supabase.ts` | Supabase client singleton |
| `src/data/supabaseRepo.ts` | QuotationRepo backed by Supabase |
| `src/data/leadSchema.ts` | Lead & CallResponse TypeScript types |
| `src/data/leadRepo.ts` | Lead CRUD repository |
| `supabase/migrations/001_initial.sql` | All table definitions |
| `scripts/migrate-json-to-supabase.ts` | One-time data migration |
| `src/pages/api/leads/index.ts` | List/create leads |
| `src/pages/api/leads/[id].ts` | Get/update single lead |
| `src/pages/api/leads/[id]/calls.ts` | Create call response |
| `src/pages/api/leads/sync.ts` | Google Sheet sync |
| `src/pages/api/leads/webhook.ts` | Meta webhook receiver |
| `src/lib/sheetSync.ts` | Google Sheets API logic |
| `src/lib/whatsapp.ts` | WhatsApp template link generator |
| `src/crm/PipelineView.tsx` | Lead pipeline Kanban/list view |
| `src/crm/LeadDetail.tsx` | Lead detail with call history |
| `src/crm/CallResponseForm.tsx` | Call response form (mirrors AppSheet) |
| `src/styles/crm.css` | CRM-specific styles |

### Existing files to modify
| File | Change |
|------|--------|
| `src/data/repo.ts` | Conditional Supabase/JSON export |
| `src/pages/index.astro` | Unified dashboard with pipeline view |
| `src/data/schema.ts` | Add `lead_id` to StoredQuotation |
| `src/pages/new.astro` | Accept query params to pre-fill from lead |
| `astro.config.mjs` | Adapter swap for Vercel |
| `package.json` | New dependencies |
| `src/styles/app.css` | Dashboard layout updates |
| `.env.local.example` | Document new env vars |

### Existing patterns to reuse
| Pattern | Source | Reuse in |
|---------|--------|----------|
| `QuotationRepo` interface | `src/data/repo.ts` | `supabaseRepo.ts` follows same interface |
| `newId()`, `newToken()` | `src/data/repo.ts` | Lead ID generation |
| AI pipeline (`parse → ground → build → narrate`) | `src/ai/pipeline/` | "Quick Generate" from lead data |
| `defaultLineOf()` factory | `src/editor/factories.ts` | Pre-filling quotations from lead data |
| Inline panel CSS pattern | `src/styles/app.css` | CRM slide-over panels |
| `Shell.astro` layout | `src/layouts/Shell.astro` | All new pages use same shell |

## Verification

1. **Database:** Run migration SQL in Supabase dashboard, verify tables created
2. **Migration:** Run `migrate-json-to-supabase.ts`, verify all 10 quotations appear in Supabase and render correctly in the editor
3. **Sheet sync:** Click sync button, verify leads from Google Sheet appear in pipeline view with correct buckets
4. **Call response:** Create a call response for a lead, verify it saves to Supabase, verify lead bucket updates
5. **Quote generation:** Click "Quick Generate" on a lead with full call data, verify quotation is created with correct destination/pax/nights
6. **Pre-fill editor:** Click "Custom Quote", verify editor opens with client name, phone, destination, dates pre-filled
7. **WhatsApp links:** Click WA button, verify it opens WhatsApp with pre-filled message containing customer name and quote link
8. **Pipeline drag:** Move a lead between buckets, verify the bucket updates in the database
9. **Follow-ups:** Create a call with next_follow_up = today, verify it appears in "follow-ups due" count
10. **TypeScript:** `npm run typecheck` passes
11. **Tests:** `npm run test` passes (existing 109 tests + new lead/CRM tests)

## Deliverable

Create `Appsheet_Plan.md` in repo root with this plan content, commit to `claude/task-fj4gbz`, and push to GitHub.
