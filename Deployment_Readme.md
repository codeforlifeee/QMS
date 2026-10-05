# Deployment Guide: CRM & Lead Management Module

This document covers everything added in the CRM & Lead Management update to the Traverse Globe QMS. It replaces the paid Google AppSheet with a built-in pipeline that handles the full **Meta Ad → Lead → Call → Quotation → WhatsApp** lifecycle inside the QMS.

---

## Table of Contents

1. [What Changed](#what-changed)
2. [Architecture Overview](#architecture-overview)
3. [New & Modified Files](#new--modified-files)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Database Setup (Supabase)](#database-setup-supabase)
7. [Data Migration (JSON → Supabase)](#data-migration-json--supabase)
8. [Google Sheet Sync Setup](#google-sheet-sync-setup)
9. [Webhook Integration (Meta / External)](#webhook-integration-meta--external)
10. [API Reference](#api-reference)
11. [CRM Features](#crm-features)
12. [Deployment Steps](#deployment-steps)
13. [Verification Checklist](#verification-checklist)

---

## What Changed

### Before

- Leads managed in **Google AppSheet** (paid), connected to a Google Sheet
- Quotations stored as JSON files on disk
- No link between leads and quotations
- Manual copy-paste of lead info when creating quotes

### After

- **Built-in CRM** with 6-bucket Kanban pipeline directly in the QMS dashboard
- **Supabase (Postgres)** backend for both leads and quotations
- **Google Sheet sync** imports existing leads from the `appsheet` tab
- **Call response logging** with 25+ fields matching every AppSheet form field
- **Lead → Quotation bridge**: one-click "Quick Generate" (AI) or "Custom Quote" (pre-filled editor)
- **WhatsApp template links** for greeting, quote-ready, and follow-up messages
- **Webhook endpoint** for ingesting leads from Meta ads or other sources
- **Dual storage**: runs on JSON files when Supabase env vars are absent, switches transparently when configured

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Astro SSR (Node)                          │
│                                                             │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────┐  │
│  │ PipelineView │   │ CallResponseForm │   │ LeadDetail │  │
│  │  (React)     │   │    (React)       │   │  (React)   │  │
│  └──────┬───────┘   └────────┬─────────┘   └─────┬──────┘  │
│         │                    │                     │         │
│         ▼                    ▼                     ▼         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              REST API  (/api/leads/*)               │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │  leadRepo (Supabase)  │  getRepo() → supabaseRepo  │    │
│  │                       │         or jsonRepo         │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Supabase (Postgres) │
              │                       │
              │  leads                │
              │  call_responses       │
              │  quotations           │
              │  citations            │
              │  chat_sessions        │
              └───────────────────────┘
```

### Dual Storage Pattern

The `getRepo()` function in `src/data/repo.ts` selects the storage backend at runtime:

- If `SUPABASE_URL` is set → uses `supabaseRepo` (Supabase/Postgres)
- Otherwise → uses `jsonRepo` (JSON files in `data/quotations/`)

This means the app works without Supabase for local development, and switches transparently when deployed with Supabase credentials.

### Lead ↔ Quotation Link

Quotations have an optional `lead_id` field (FK to the `leads` table). When a quotation is generated from a lead via "Quick Generate" or "Custom Quote", the `lead_id` is stored on the quotation. The dashboard shows a "From Lead" pill on linked quotations.

---

## New & Modified Files

### New Files (17)

| File | Purpose |
|------|---------|
| **Data Layer** | |
| `src/data/supabase.ts` | Supabase client singleton + `hasSupabase()` helper |
| `src/data/supabaseRepo.ts` | `QuotationRepo` implementation for Supabase |
| `src/data/leadSchema.ts` | Lead & CallResponse TypeScript types, priority buckets, call statuses, and `callStatusToBucket()` mapper |
| `src/data/leadRepo.ts` | Supabase-backed CRUD for leads and call responses |
| **API Routes** | |
| `src/pages/api/leads/index.ts` | `GET` list leads (with stats) / `POST` create lead |
| `src/pages/api/leads/[id].ts` | `GET` single lead + calls / `PUT` update lead |
| `src/pages/api/leads/[id]/calls.ts` | `POST` log a call response |
| `src/pages/api/leads/sync.ts` | `POST` trigger Google Sheet sync |
| `src/pages/api/leads/webhook.ts` | `POST` ingest leads from external sources |
| **CRM UI** | |
| `src/crm/PipelineView.tsx` | 6-column Kanban board + table list view |
| `src/crm/LeadDetail.tsx` | Lead detail panel with call history timeline |
| `src/crm/CallResponseForm.tsx` | 25+ field call response modal form |
| **Integrations** | |
| `src/lib/sheetSync.ts` | Google Sheets API v4 sync logic |
| `src/lib/whatsapp.ts` | WhatsApp `wa.me` template link generator |
| **Styles** | |
| `src/styles/crm.css` | 639 lines of CRM-specific CSS (responsive) |
| **Database** | |
| `supabase/migrations/001_initial.sql` | 5 tables + 6 indexes |
| **Migration** | |
| `scripts/migrate-json-to-supabase.ts` | One-time JSON → Supabase data migration |

### Modified Files (12)

| File | Change |
|------|--------|
| `src/data/repo.ts` | Added `getRepo()` function (conditional Supabase/JSON) |
| `src/data/schema.ts` | Added `lead_id?: string` to `StoredQuotation` |
| `src/pages/index.astro` | Unified dashboard: CRM pipeline + quotation list + "From Lead" pills |
| `src/pages/new.astro` | Accepts query params for lead pre-fill (`client_name`, `client_phone`, `destination`, `lead_id`, etc.) |
| `src/pages/api/ai/generate.ts` | Accepts `lead_id` in request body, stores on generated quotation |
| `src/pages/api/pdf/[token].ts` | Migrated from `jsonRepo` to `getRepo()` |
| `src/pages/api/quotations/save.ts` | Migrated from `jsonRepo` to `getRepo()` |
| `src/pages/edit/[id].astro` | Migrated from `jsonRepo` to `getRepo()` |
| `src/pages/api/ai/chat.ts` | Migrated from `jsonRepo` to `getRepo()` |
| `src/pages/api/ai/chat/[id].ts` | Migrated from `jsonRepo` to `getRepo()` |
| `src/pages/api/ai/chat/save.ts` | Migrated from `jsonRepo` to `getRepo()` |
| `src/pages/api/ai/citations/[id].ts` | Migrated from `jsonRepo` to `getRepo()` |
| `src/lib/load.ts` | Migrated from `jsonRepo` to `getRepo()` |
| `package.json` | Added `@supabase/supabase-js` and `googleapis` |
| `.env.example` | Documented all new env vars |

---

## Prerequisites

- **Node.js** 18+ and npm
- A **Supabase** project (free tier works) — [supabase.com](https://supabase.com)
- A **Google Cloud** API key with Google Sheets API enabled (for lead sync)
- At least one AI provider key (Anthropic, OpenAI, Groq, or Google AI) for quotation generation

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | For CRM | Your Supabase project URL (e.g., `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | For CRM | Supabase service role key (full access, used server-side) |
| `SUPABASE_ANON_KEY` | Optional | Supabase anonymous key (fallback if service key not set) |
| `GOOGLE_SHEETS_API_KEY` | For sync | Google Cloud API key with Sheets API enabled |
| `ANTHROPIC_API_KEY` | For AI | Anthropic API key for quotation generation |
| `GROQ_API_KEY` | For AI | Groq API key (alternative AI provider) |
| `OPENAI_API_KEY` | For AI | OpenAI API key (alternative AI provider) |
| `GOOGLE_AI_KEY` | For AI | Google AI API key (alternative AI provider) |

**Note:** If `SUPABASE_URL` is not set, the app falls back to JSON file storage automatically. The CRM features (leads, calls, pipeline) require Supabase.

---

## Database Setup (Supabase)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and service role key from **Settings → API**

### 2. Run the Migration

Open the **SQL Editor** in your Supabase dashboard and paste the contents of `supabase/migrations/001_initial.sql`, then click **Run**.

This creates 5 tables and 6 indexes:

#### Tables

| Table | Description |
|-------|-------------|
| `leads` | Customer leads with 14 fields. UUID primary key, `external_id` for dedup, `priority_bucket` with CHECK constraint for 6 valid buckets |
| `call_responses` | Call log entries with 25+ fields. FK to `leads` with CASCADE delete. CHECK constraints on `call_status`, `wa_status`, `hotel_category`, `visa`, `flights`, `transfers_type`, `budget`, `priority` |
| `quotations` | Quotation storage. Text ID primary key, `token` for share links, `lead_id` FK to leads (SET NULL on delete), full quotation stored as JSONB in `data` column |
| `citations` | AI citation data per quotation. FK with CASCADE |
| `chat_sessions` | AI chat history per quotation. FK with CASCADE |

#### Indexes

| Index | On | Purpose |
|-------|----|---------|
| `idx_leads_bucket` | `leads(priority_bucket)` | Fast Kanban column queries |
| `idx_leads_updated` | `leads(updated_at DESC)` | Fast list ordering |
| `idx_call_responses_lead` | `call_responses(lead_id)` | Fast call history lookups |
| `idx_call_responses_followup` | `call_responses(next_follow_up)` | Follow-up due queries |
| `idx_quotations_lead` | `quotations(lead_id)` | Lead-to-quotation lookups |
| `idx_quotations_token` | `quotations(token)` | Share link lookups |

#### Lead Priority Buckets

The pipeline has 6 buckets. When a call is logged, the lead's bucket auto-updates based on the call status:

| Call Status | → Auto-Bucket |
|-------------|---------------|
| `Call not connected` | Call Not Connected |
| `Talk in Progress` | In Progress |
| `Traveler will finalise and is My Hot` | My Hot |
| `Warm Lead` | Warm Lead |
| `Won't book with me/ Rejected` | Rejected |

---

## Data Migration (JSON → Supabase)

If you have existing quotations stored as JSON files in `data/quotations/`, migrate them to Supabase with:

```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
npx tsx scripts/migrate-json-to-supabase.ts
```

The script:
- Reads all `.json` files from `data/quotations/` (skipping `.citations.json` and `.chat.json`)
- Upserts each quotation into the `quotations` table (safe to run multiple times)
- Also migrates associated citation and chat files if they exist
- Reports success/failure per file

---

## Google Sheet Sync Setup

The CRM can pull leads from a Google Sheet. This is configured to read from a specific sheet used by the existing AppSheet setup.

### 1. Get a Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Google Sheets API**
4. Go to **Credentials → Create Credentials → API Key**
5. Set the key as `GOOGLE_SHEETS_API_KEY` in your environment

### 2. Sheet Configuration

The sync reads from:
- **Sheet ID:** `1niYNMdUZsWGnH2BxsnmG8DtKUfI3gecWNKp4jkOGmPA`
- **Tab name:** `appsheet`

These are hardcoded in `src/lib/sheetSync.ts`. To change the sheet, edit the `SHEET_ID` and `TAB_NAME` constants.

### 3. How Sync Works

1. User clicks **"Sync Sheet"** button on the dashboard (or `POST /api/leads/sync`)
2. The app reads all rows from the `appsheet` tab via Google Sheets API v4
3. Column headers are normalized to snake_case
4. Each row is upserted into Supabase using the sheet's `id` / `_rowid` column as a dedup key
5. Bucket names are normalized to match the 6 valid pipeline stages

**Column Mapping** (the sync handles these alternate column names):

| Sheet Column | → Lead Field |
|--------------|-------------|
| `Customer Name` or `Name` | `customer_name` |
| `Phone` or `Mobile` or `Phone Number` | `phone` |
| `Email` | `email` |
| `City` or `Destination City` | `city` |
| `Travelling Month` or `Travel Month` | `travelling_month` |
| `Planning With` | `planning_with` |
| `Pax Summary` or `Number of Adults and Child (Below 9)?` | `pax_summary` |
| `Special Arrangements` or `Requirements` | `special_arrangements` |
| `Priority Bucket` or `Status` | `priority_bucket` |

---

## Webhook Integration (Meta / External)

The webhook endpoint accepts leads from external sources like Meta Lead Ads, form builders, or custom integrations.

**Endpoint:** `POST /api/leads/webhook`

### Single Lead

```json
{
  "customer_name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "city": "Mumbai",
  "travelling_month": "December 2025"
}
```

### Batch (Array)

```json
[
  { "name": "Jane Doe", "phone": "+919876543211", "city": "Delhi" },
  { "name": "Bob Smith", "phone": "+919876543212", "city": "Pune" }
]
```

- Accepts `name` as an alias for `customer_name`
- All leads are created with bucket `Untouched Leads`
- Returns `{ ok: true, created: N, ids: [...] }` for batch, or `{ ok: true, lead: {...} }` for single

### Meta Lead Ads Integration

To connect Meta Lead Ads:
1. In Meta Business Manager, set up a webhook or use Zapier/Make
2. Point the webhook URL to `https://your-domain.com/api/leads/webhook`
3. Map the Meta form fields to the JSON structure above

---

## API Reference

All endpoints return JSON. Base path: `/api/leads`

### GET /api/leads

List all leads with stats.

**Query params:**
- `bucket` (optional) — filter by priority bucket (e.g., `?bucket=My%20Hot`)

**Response:**
```json
{
  "leads": [{ "id": "uuid", "customer_name": "...", "priority_bucket": "...", ... }],
  "stats": {
    "Untouched Leads": 12,
    "Call Not Connected": 5,
    "In Progress": 3,
    "My Hot": 2,
    "Warm Lead": 1,
    "Rejected": 0
  }
}
```

### POST /api/leads

Create a new lead.

**Body:** `{ "customer_name": "..." }` (required) + optional fields: `phone`, `email`, `city`, `travelling_month`, `planning_with`, `pax_summary`, `special_arrangements`, `priority_bucket`

**Response:** `201 { "ok": true, "lead": {...} }`

### GET /api/leads/:id

Get a single lead with its call history.

**Response:** `{ "lead": {...}, "calls": [...] }`

### PUT /api/leads/:id

Update a lead (partial update).

**Body:** Any subset of lead fields (e.g., `{ "priority_bucket": "My Hot" }`)

**Response:** `{ "ok": true, "lead": {...} }`

### POST /api/leads/:id/calls

Log a new call response. Auto-updates the lead's priority bucket based on `call_status`.

**Body fields:**
- `call_status` — one of: `Call not connected`, `Talk in Progress`, `Traveler will finalise and is My Hot`, `Warm Lead`, `Won't book with me/ Rejected`
- `call_date_time`, `called_by`, `call_progress`, `wa_status`
- `destination_city`, `travel_date`, `total_adults`, `total_children`, `child_ages`, `total_nights`
- `hotel_category` (`3 Star` / `4 Star` / `5 Star`), `visa`, `flights` (`Yes` / `No`)
- `transfers_type` (`Private Transfers` / `Sharing Transfers`)
- `requirements`, `remarks`, `budget` (`Affordable` / `Medium` / `Premium` / `Luxury`)
- `next_follow_up`, `lead_source`, `priority` (`P1` / `P2` / `P3`)

**Response:** `201 { "ok": true, "call": {...} }`

### POST /api/leads/sync

Trigger a Google Sheet sync.

**Response:** `{ "ok": true, "imported": 15, "errors": [] }`

### POST /api/leads/webhook

Ingest leads from external sources. See [Webhook Integration](#webhook-integration-meta--external).

---

## CRM Features

### Kanban Pipeline Board

The main dashboard (`/`) shows a 6-column Kanban board:

| Column | Color |
|--------|-------|
| Untouched Leads | Blue |
| Call Not Connected | Orange |
| In Progress | Teal |
| My Hot | Red |
| Warm Lead | Purple |
| Rejected | Gray |

Features:
- **Board view** (Kanban) and **List view** (table) toggle
- **Search** by customer name, phone, or city
- **Bucket counts** displayed as badges on each column
- **Stats bar** showing totals per bucket
- Click a lead card to open the detail panel

### Lead Detail Panel

Shows:
- Contact info (name, phone, email, city, travelling month, planning with, pax, special arrangements)
- Bucket selector dropdown
- Call history timeline with color-coded status dots
- Action buttons:
  - **New Call** — opens the call response form
  - **Quick Generate** — sends lead data to the AI quotation pipeline
  - **Custom Quote** — opens the quotation editor pre-filled with lead data
  - **WhatsApp** — opens wa.me with a pre-filled greeting message

### Call Response Form

A modal form with 25+ fields matching every field in the original AppSheet form:
- Segmented button controls for call status, WA status, hotel category, visa, flights, transfers, budget, priority
- Number inputs with +/- steppers for adults, children, nights
- Date pickers for travel date and next follow-up
- Text areas for requirements and remarks

### Lead → Quotation Bridge

Two paths to create a quotation from a lead:

1. **Quick Generate** — Builds a natural language prompt from the call response data (destination, nights, adults, children, hotel category, budget, requirements) and sends it through the AI generation pipeline. The resulting quotation is linked back via `lead_id`.

2. **Custom Quote** — Redirects to `/new` with query parameters pre-filled from the lead:
   - `client_name`, `client_phone`, `client_email`
   - `destination`, `adults`, `children`, `nights`, `travel_date`
   - `lead_id`

### WhatsApp Templates

Three pre-built message templates accessible from the lead detail panel:

| Template | Usage |
|----------|-------|
| `greeting` | Initial response to a lead inquiry |
| `quote_ready` | Send when a quotation is ready (includes quotation link) |
| `follow_up` | Gentle follow-up on an existing inquiry |

---

## Deployment Steps

### Option A: Render (Current Host)

1. Set the environment variables in the Render dashboard under your service's **Environment** tab
2. Push the code to your connected branch
3. Render will auto-deploy
4. Run the database migration SQL in the Supabase dashboard
5. If migrating from JSON storage, run the migration script locally:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/migrate-json-to-supabase.ts
   ```

### Option B: Vercel

1. Install the Vercel adapter:
   ```bash
   npm install @astrojs/vercel
   ```
2. Update `astro.config.mjs`:
   ```js
   import vercel from '@astrojs/vercel';
   export default defineConfig({
     output: 'server',
     adapter: vercel(),
   });
   ```
3. Set environment variables in the Vercel dashboard
4. Connect your GitHub repo for auto-deploy
5. Run the database migration and data migration as above

### Post-Deployment

1. Open the dashboard and click **"Sync Sheet"** to import existing leads from Google Sheet
2. Verify leads appear in the correct pipeline buckets
3. Test creating a call response and confirming the bucket auto-updates
4. Test "Quick Generate" and "Custom Quote" flows
5. Test WhatsApp links open with correct pre-filled messages

---

## Verification Checklist

- [ ] Supabase tables created (5 tables, 6 indexes)
- [ ] Environment variables configured (Supabase URL + key, Sheets API key, at least one AI key)
- [ ] Existing JSON quotations migrated to Supabase
- [ ] Dashboard loads with CRM pipeline at top, quotations below
- [ ] Google Sheet sync imports leads into correct buckets
- [ ] Creating a call response auto-updates the lead's bucket
- [ ] "Quick Generate" creates an AI quotation linked to the lead
- [ ] "Custom Quote" opens editor pre-filled with lead data
- [ ] WhatsApp buttons open wa.me with correct pre-filled messages
- [ ] Webhook endpoint accepts single and batch lead payloads
- [ ] All existing quotation features still work (edit, PDF, share)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (109 existing tests)
