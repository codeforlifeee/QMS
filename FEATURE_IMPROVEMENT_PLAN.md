# QMS Feature Improvement Plan

> **Traverse Globe — Quotation Maker Service**
> New features and capabilities to bring QMS to parity with top travel platforms (Travefy, Ezus, TravelJoy) and beyond, leveraging QMS's unique AI advantage.

---

## Table of Contents

1. [Feature Gap Analysis](#1-feature-gap-analysis)
2. [Feature 1: Analytics Dashboard](#2-feature-1-analytics-dashboard)
3. [Feature 2: Drag-and-Drop Itinerary Builder](#3-feature-2-drag-and-drop-itinerary-builder)
4. [Feature 3: Quotation Templates Library](#4-feature-3-quotation-templates-library)
5. [Feature 4: Calendar & Task Management](#5-feature-4-calendar--task-management)
6. [Feature 5: Supplier Catalog Management](#6-feature-5-supplier-catalog-management)
7. [Feature 6: Commission & Invoice Tracking](#7-feature-6-commission--invoice-tracking)
8. [Feature 7: Email Integration & Automation](#8-feature-7-email-integration--automation)
9. [Feature 8: Notification System](#9-feature-8-notification-system)
10. [Feature 9: Global Search & Command Palette](#10-feature-9-global-search--command-palette)
11. [Feature 10: Notes & Internal Communication](#11-feature-10-notes--internal-communication)
12. [Feature 11: Enhanced AI Capabilities](#12-feature-11-enhanced-ai-capabilities)
13. [Feature 12: Settings & Configuration](#13-feature-12-settings--configuration)
14. [Database Schema Changes](#14-database-schema-changes)
15. [Implementation Priority Matrix](#15-implementation-priority-matrix)
16. [Implementation Roadmap](#16-implementation-roadmap)

---

## 1. Feature Gap Analysis

### What Competitors Have That QMS Lacks

| Feature Category | Travefy | Ezus | TravelJoy | QMS Current | QMS Planned |
|-----------------|---------|------|-----------|-------------|-------------|
| **Analytics** | Basic | Rich | Basic | Counts only | Full dashboard |
| **Drag-and-Drop** | Itinerary | Full editor | No | No | Itinerary + lines |
| **Templates** | Yes (200+) | Yes | Yes | No | Custom library |
| **Calendar** | Integrated | Yes | Yes | No | Full calendar |
| **Catalog Admin** | Supplier DB | Full CRUD | No | JSON files only | Full CRUD UI |
| **Invoicing** | No | Yes | Yes | No | Basic tracking |
| **Commission** | Yes | Yes | No | No | Per-quote tracking |
| **Email** | In-app | No | In-app | No | Send + templates |
| **Notifications** | Push + in-app | In-app | In-app | Toast only | Push + in-app + bell |
| **Search** | Basic | Global | Basic | Per-page | Global Cmd+K |
| **Notes** | On itinerary | Per project | Per trip | No | Per lead + quote |
| **AI Generation** | No | No | No | 4-step pipeline | Enhanced pipeline |
| **AI Chat** | No | No | No | ReAct agent | Improved UX |
| **Multi-currency** | No | Yes | No | Yes (3 currencies) | Keep + improve |
| **PDF Quality** | Template-based | Word/PPT/PDF | Basic | Puppeteer vector | Keep (no change) |

### QMS Unique Advantages to Amplify

1. **AI Quotation Generation** — No competitor offers this. Enhance with better prompts, more grounding, template-based generation.
2. **AI Chat Agent** — Interactive editor assistant with catalog search. Improve UX and tool capabilities.
3. **Precision Pricing** — BigInt-based exact arithmetic. Already best-in-class.
4. **Multi-Provider AI** — Flexibility to use Claude, GPT, Groq, or Gemini. Add provider comparison.

---

## 2. Feature 1: Analytics Dashboard

### Overview
A dedicated analytics page with real charts, KPIs, and insights — replacing the basic count-only stats on the current dashboard.

### New Page: `/analytics`

**File**: `src/pages/analytics.astro`

### Dashboard Sections

#### Section 1: KPI Overview Row
| KPI | Calculation | Visual |
|-----|-------------|--------|
| Total Leads (this month) | Count leads created this month | Number + % change from last month |
| Conversion Rate | (Accepted quotes / Total quotes) × 100 | Percentage + trend sparkline |
| Revenue (this month) | Sum of accepted quotation grand totals | Currency formatted + area sparkline |
| Average Quote Value | Total revenue / accepted quotes | Currency formatted |
| Avg Response Time | Time from lead creation to first call | Hours/days + trend |

#### Section 2: Lead Analytics
- **Lead Source Performance** (donut chart): Meta Ads vs Google Sheet vs Referral vs Direct — shows volume AND conversion rate per source
- **Lead Funnel** (horizontal bar chart): Untouched → Called → In Progress → Hot → Quoted → Converted — with drop-off percentages at each stage
- **Leads Over Time** (area chart): New leads per day/week/month with trend line
- **Lead Response Time Distribution** (histogram): How quickly leads get their first call

#### Section 3: Quotation Analytics
- **Quotation Status Breakdown** (stacked bar chart): Draft/Sent/Accepted/Expired/Void over time
- **Revenue Trend** (area chart with gradient): Monthly revenue with accepted quotation totals
- **Quote-to-Win Rate** (gauge chart): Percentage of sent quotes that get accepted
- **Average Margin** (line chart): Average markup percentage over time
- **Top Destinations** (horizontal bar): Most quoted destinations ranked by volume and revenue

#### Section 4: Agent Performance
- **Quotes Per Agent** (bar chart): Quotations created by each `agentName`
- **Agent Conversion Rates** (bar chart): Accepted/Total ratio per agent
- **Agent Revenue** (bar chart): Total accepted value per agent

#### Section 5: Follow-up Health
- **Overdue Follow-ups** (count with urgency coloring)
- **Follow-up Completion Rate** (percentage)
- **Follow-ups Scheduled This Week** (calendar heatmap)

### Filters & Controls
- Date range selector: Today, Last 7 Days, Last 30 Days, This Quarter, This Year, Custom Range
- Compare period toggle: "vs Previous Period" (shows comparison overlay)
- Export: Download as CSV / PNG

### API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analytics/overview` | GET | KPI calculations with period comparison |
| `/api/analytics/leads` | GET | Lead funnel, source breakdown, timeline data |
| `/api/analytics/quotations` | GET | Quote stats, revenue trends, margin data |
| `/api/analytics/agents` | GET | Per-agent performance metrics |

### Implementation Notes
- Use **Recharts** for all visualizations (React-based, composable, responsive)
- Charts must support dark mode (different grid/axis colors)
- Data aggregation happens server-side in API routes (not client-side)
- Cache expensive queries (5-minute TTL) for dashboard performance
- All monetary values computed using the existing pricing engine

---

## 3. Feature 2: Drag-and-Drop Itinerary Builder

### Overview
Replace the current up/down arrow reordering with modern drag-and-drop using `@dnd-kit`.

### Library: `@dnd-kit`
- `@dnd-kit/core` — DnD engine
- `@dnd-kit/sortable` — Sortable list preset
- `@dnd-kit/utilities` — CSS transform utilities

### Drag-and-Drop Zones

#### Zone 1: Days in the Itinerary
**Current**: Each day has ↑/↓ buttons to move up/down
**New**: Drag handle (grip icon) on left side of each day card

```
[ ⠿ ] Day 1 — Arrival in Dubai                    [▼ expand]
[ ⠿ ] Day 2 — Desert Safari & City Tour            [▼ expand]
[ ⠿ ] Day 3 — Abu Dhabi Day Trip                   [▼ expand]
        ┌─────────────────────────────────┐
        │  + Add Day                       │
        └─────────────────────────────────┘
```

**Behavior:**
- Grab the grip icon (⠿) to start dragging
- Dragged day elevates with shadow and slight rotation
- Drop zones highlighted between other days
- On drop: `days` array reordered, `index` field recalculated, autosave triggered
- Smooth spring animation to new position
- Touch support: long-press to initiate drag on mobile

#### Zone 2: Line Items
**Current**: ↑/↓ arrows on each line item
**New**: Drag-and-drop with optional grouping by day

**Behavior:**
- Lines can be reordered within their current position
- Lines can optionally be grouped by day (drag between day sections)
- Compact drag preview showing line name + type icon
- Multi-select drag: hold Shift to select multiple lines, drag together

#### Zone 3: Lead Pipeline Kanban Board
**Current**: No drag-and-drop between columns
**New**: Drag lead cards between priority bucket columns

**Behavior:**
- Grab any part of the lead card to start dragging
- Card visually lifts from the column
- Valid drop columns highlighted
- On drop: lead's `priority_bucket` updated via API call
- Optimistic update: card moves immediately, rolls back on API error
- Animation: card slides into new position with spring physics

### Accessibility for DnD
- Keyboard support: Tab to drag handle → Space to pick up → Arrow keys to move → Space to drop
- Screen reader announcements: "Picked up Day 2. Current position: 2 of 5. Use arrow keys to move."
- `aria-roledescription="sortable"` on draggable items
- `aria-describedby` linking to drag instructions text

### Files to Modify
- `src/editor/Editor.tsx` — Wrap days/lines in `DndContext` + `SortableContext`
- `src/editor/parts/DayEditor.tsx` — Add drag handle, wrap in `useSortable`
- `src/editor/parts/LineEditor.tsx` — Add drag handle, wrap in `useSortable`
- `src/crm/PipelineView.tsx` — Wrap kanban in `DndContext`, columns as `useDroppable`, cards as `useDraggable`

---

## 4. Feature 3: Quotation Templates Library

### Overview
Save and reuse quotation templates for common trip types, dramatically speeding up quote creation.

### New Page: `/templates`

**File**: `src/pages/templates.astro`

### Template Data Model

```typescript
interface QuotationTemplate {
  id: string;
  name: string;           // "Dubai 5N Honeymoon"
  description: string;    // "Romantic Dubai package with desert safari, cruise dinner..."
  category: string;       // "Honeymoon" | "Family" | "Adventure" | "Luxury" | "Budget"
  destination: string;    // "Dubai" | "Bali" | "Thailand" | etc.
  duration: number;       // nights
  thumbnail_url?: string; // preview image
  template_data: Partial<StoredQuotation>; // the actual template content
  usage_count: number;    // how many quotes created from this
  created_at: string;
  updated_at: string;
}
```

### Features

#### Template Gallery
- Grid of template cards showing: thumbnail, name, destination, duration, category badge, usage count
- Filter by: category, destination, duration range
- Search by name/description
- Sort by: most used, newest, alphabetical

#### Create Template
Two ways to create templates:
1. **From existing quotation**: "Save as Template" button in the editor → strips client-specific data, keeps structure
2. **From scratch**: "New Template" → opens editor in template mode (no client/dates required)

#### Use Template
- From quotation list page: "New from Template" button → opens template gallery → select → creates new draft pre-filled with template data
- From lead detail page: "Generate from Template" → template gallery → select → creates quote linked to lead
- Template data is copied (not referenced) — editing the quote doesn't affect the template

#### Template Editor
- Same editor as quotations but with template-specific differences:
  - No client section (filled when creating quote from template)
  - No travel dates (filled when creating)
  - Placeholder text shown where dynamic values go
  - "Template Preview" tab shows how the final quote would look

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/templates` | GET | List all templates with filters |
| `/api/templates` | POST | Create new template |
| `/api/templates/[id]` | GET | Get template by ID |
| `/api/templates/[id]` | PUT | Update template |
| `/api/templates/[id]` | DELETE | Delete template |
| `/api/templates/[id]/use` | POST | Create quotation from template |

### Database Table

```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  destination TEXT DEFAULT '',
  duration INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  template_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Feature 4: Calendar & Task Management

### Overview
Visual calendar for follow-ups, travel dates, and tasks — replacing the current "Follow-ups Due" count with actionable scheduling.

### New Page: `/calendar`

**File**: `src/pages/calendar.astro`

### Calendar Views

#### Month View (default)
- Standard calendar grid
- Day cells show event dots/pills:
  - Orange dot: Follow-up calls scheduled
  - Blue dot: Travel departure dates
  - Green dot: Quote deadlines (validUntil dates)
  - Red dot: Overdue items
- Click a day → shows that day's events in a side panel
- Today highlighted with orange border

#### Week View
- 7-column grid with hourly rows
- Events displayed as blocks
- Drag to reschedule events

#### Agenda View (List)
- Chronological list of all upcoming events
- Grouped by day
- Filter by event type
- Best for mobile

### Event Types

| Type | Source | Color | Icon |
|------|--------|-------|------|
| **Follow-up Call** | `call_responses.next_follow_up` | Orange | `Phone` |
| **Travel Departure** | `quotations.data.travelStart` (accepted quotes) | Blue | `Plane` |
| **Quote Deadline** | `quotations.data.validUntil` | Amber | `Clock` |
| **Custom Task** | New `tasks` table | Gray | `CheckSquare` |
| **Overdue Follow-up** | Past follow-ups not marked done | Red | `AlertTriangle` |

### Task Management

New task system integrated with calendar:

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  lead_id?: string;      // optional link to a lead
  quotation_id?: string; // optional link to a quotation
  created_at: string;
  completed_at?: string;
}
```

**Task features:**
- Quick-add task from anywhere (keyboard shortcut `T`)
- Task linked to leads or quotations
- Task list widget on dashboard
- Overdue tasks highlighted in red
- Complete task with one click (checkbox)

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/calendar/events` | GET | Aggregate events from follow-ups, travel dates, tasks |
| `/api/tasks` | GET, POST | List and create tasks |
| `/api/tasks/[id]` | GET, PUT, DELETE | Read, update, delete a task |

### Database Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  due_time TIME,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  lead_id UUID REFERENCES leads(id),
  quotation_id TEXT REFERENCES quotations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

---

## 6. Feature 5: Supplier Catalog Management

### Overview
Replace JSON-file-based catalog management with a full CRUD admin interface. Currently, updating the product catalog requires editing `data/catalog/products.json` manually.

### New Page: `/catalog`

**File**: `src/pages/catalog/index.astro`

### Catalog Sections

#### Products/Activities Tab
- DataTable view of all products
- Columns: Name, Category, Location, Supplier, Cost (AED), Cost (USD), Status
- Inline editing: click a cell to edit
- Bulk import from CSV/Excel
- Add single product form
- Delete with confirmation
- Filter by: category, location, supplier, price range
- Search across all fields

#### Transport Tab
- DataTable of all transport options
- Columns: Route, Vehicle Size, Supplier, Rate, Status
- Same CRUD capabilities as products

#### City Tours Tab
- DataTable of all city tours
- Columns: Tour Name, Type (Sharing/Private), Duration, Rate, Status
- Same CRUD capabilities

#### Hotels Tab (NEW)
- Currently hotels are not in the catalog (manually entered in quotations)
- New hotel database:
  - Hotel name, star rating, location, room types
  - Rack rates per room type per season
  - Supplier/contract info
  - Amenities and descriptions
  - Photos (URL references)

### Catalog Data Model Changes

Migrate from JSON files to Supabase tables:

```sql
CREATE TABLE catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  location TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  cost_aed INTEGER DEFAULT 0,      -- minor units (fils)
  cost_usd INTEGER DEFAULT 0,      -- minor units (cents)
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE catalog_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  vehicle_size TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  rate_aed INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE catalog_city_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_name TEXT NOT NULL,
  tour_type TEXT DEFAULT 'sharing' CHECK (tour_type IN ('sharing', 'private')),
  duration TEXT DEFAULT '',
  rate_aed INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE catalog_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  star_rating INTEGER DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
  location TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  room_types JSONB DEFAULT '[]',
  amenities TEXT[] DEFAULT '{}',
  description TEXT DEFAULT '',
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration Path
1. Keep JSON files as fallback (existing `getRepo()` pattern)
2. Add Supabase tables for catalog data
3. Build import script to seed Supabase from existing JSON files
4. Update catalog search (`src/catalog/catalog.ts`) to query Supabase when available
5. AI grounding (`src/ai/pipeline/ground.ts`) continues working via the catalog search abstraction

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/catalog/products` | GET, POST | List and create products |
| `/api/catalog/products/[id]` | PUT, DELETE | Update and delete product |
| `/api/catalog/products/import` | POST | Bulk import from CSV |
| `/api/catalog/transport` | GET, POST | (existing search + create) |
| `/api/catalog/transport/[id]` | PUT, DELETE | Update and delete |
| `/api/catalog/city-tours` | GET, POST | (existing search + create) |
| `/api/catalog/city-tours/[id]` | PUT, DELETE | Update and delete |
| `/api/catalog/hotels` | GET, POST | List and create hotels |
| `/api/catalog/hotels/[id]` | PUT, DELETE | Update and delete hotel |

---

## 7. Feature 6: Commission & Invoice Tracking

### Overview
Track supplier commissions and generate basic invoices for clients — currently absent from QMS.

### New Page: `/invoices`

**File**: `src/pages/invoices.astro`

### Commission Tracking

#### Per-Quotation Commission Fields
Add to the quotation data model:
```typescript
interface CommissionInfo {
  supplier_commission_pct: number;    // e.g. 10 for 10%
  supplier_commission_amount: number; // calculated from total cost
  agent_commission_pct: number;       // agent's share
  agent_commission_amount: number;
  commission_status: 'pending' | 'invoiced' | 'received' | 'paid_out';
  commission_notes: string;
}
```

#### Commission Dashboard (section on Analytics page)
- Total commissions pending
- Total commissions received this month/quarter/year
- Per-supplier commission breakdown
- Per-agent commission breakdown
- Commission aging report (how long since quote was accepted)

### Invoice Generation

#### Invoice Data Model
```typescript
interface Invoice {
  id: string;
  invoice_number: string;        // auto-generated: INV-2026-001
  quotation_id: string;          // linked quotation
  lead_id: string;               // linked lead
  client_name: string;
  client_email: string;
  client_phone: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: 'INR' | 'AED' | 'USD';
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  issued_date: string;
  due_date: string;
  paid_amount: number;
  payment_history: PaymentRecord[];
  notes: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface PaymentRecord {
  date: string;
  amount: number;
  method: string;  // Bank Transfer, UPI, Card, Cash
  reference: string;
  notes: string;
}
```

#### Invoice Features
- **Auto-generate** from accepted quotation (pre-fills items from quote line items)
- **Invoice list** with status filters (Draft, Sent, Paid, Overdue)
- **Payment recording** with multiple partial payments
- **Payment reminders** (manual trigger → email or WhatsApp)
- **Invoice PDF** generation (reuse Puppeteer pipeline)
- **Overdue highlighting** when past due date
- **Revenue recognition** dashboard integration

### Database Tables

```sql
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  quotation_id TEXT REFERENCES quotations(id),
  lead_id UUID REFERENCES leads(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,    -- minor units
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR' CHECK (currency IN ('INR', 'AED', 'USD')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  issued_date DATE,
  due_date DATE,
  paid_amount INTEGER DEFAULT 0,
  payment_history JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/invoices` | GET, POST | List and create invoices |
| `/api/invoices/[id]` | GET, PUT, DELETE | Read, update, delete invoice |
| `/api/invoices/[id]/payment` | POST | Record a payment |
| `/api/invoices/[id]/send` | POST | Send invoice via email |
| `/api/invoices/[id]/pdf` | GET | Generate invoice PDF |
| `/api/invoices/generate` | POST | Auto-generate from quotation |

---

## 8. Feature 7: Email Integration & Automation

### Overview
Send quotations, invoices, and follow-up emails directly from QMS instead of using external email clients.

### Email Sending

#### Integration Options (in priority order)
1. **Resend** (recommended) — Modern email API, easy setup, good templates, generous free tier (100 emails/day)
2. **SendGrid** — Widely used, more complex setup
3. **Gmail API** — Already have googleapis dependency, but more limited

#### Email Templates

| Template | Trigger | Content |
|----------|---------|---------|
| **Quote Ready** | Manual from editor | Greeting + quote summary + "View Your Itinerary" button linking to `/q/[token]` + PDF attachment |
| **Follow-up** | Manual or scheduled | Friendly check-in + quote link + "Any questions?" CTA |
| **Invoice** | From invoice page | Invoice details + "Pay Now" link + PDF attachment |
| **Payment Confirmation** | After recording payment | Thank you + receipt summary |
| **Booking Confirmation** | When quote status → accepted | Trip summary + important dates + contact info |

#### Email Composer
- Accessible from:
  - Lead detail page: "Email" action button
  - Quotation editor: "Send Quote" button
  - Invoice page: "Send Invoice" button
- Rich text editor with formatting
- Template selector (pre-fills content)
- Attachment support (auto-attach PDF)
- Preview before sending
- CC/BCC fields
- Schedule send (later today, tomorrow, custom date/time)

#### Email History
- Track all sent emails per lead
- Show in lead detail timeline
- Open/click tracking (if using Resend/SendGrid webhooks)
- Bounce/delivery status

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/email/send` | POST | Send an email |
| `/api/email/templates` | GET | List email templates |
| `/api/email/history` | GET | Get email history for a lead |

### Dependencies
```bash
npm install resend
```

### Environment Variables
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=holidays@traverseglobe.com
```

---

## 9. Feature 8: Notification System

### Overview
Replace the basic toast-only notifications with a comprehensive in-app + browser push notification system.

### Notification Types

| Event | Priority | Channel |
|-------|----------|---------|
| New lead received (Facebook/Sheets) | High | Push + In-app + Sound |
| Follow-up due today | Medium | In-app + Push (morning digest) |
| Follow-up overdue | High | In-app + Push |
| Quotation status changed | Medium | In-app |
| Quote viewed by client | Low | In-app |
| Payment received | High | Push + In-app |
| Invoice overdue | High | Push + In-app |
| Sync completed | Low | In-app |
| AI generation completed | Medium | In-app |

### In-App Notification Center

**Component**: `src/components/layout/NotificationCenter.tsx`

**Bell Icon (TopBar):**
- Bell icon with unread count badge (red dot with number)
- Click opens notification dropdown panel
- Panel shows recent notifications grouped by "Today", "Yesterday", "Earlier"
- Each notification: icon + title + description + timestamp + read/unread indicator
- Click notification → navigate to relevant page
- "Mark all as read" button
- "View all" link → notification settings

**Notification Item Structure:**
```typescript
interface Notification {
  id: string;
  type: string;          // 'new_lead' | 'follow_up_due' | 'quote_status' | etc.
  title: string;         // "New Lead: John Doe"
  message: string;       // "From Meta Ads · Dubai · 2 adults"
  link?: string;         // "/leads/uuid-here"
  read: boolean;
  created_at: string;
}
```

### Browser Push Notifications

**Implementation:**
- Use the Web Push API (Service Worker based)
- Request permission on first meaningful interaction
- Push notifications for high-priority events
- Click notification → open QMS to relevant page
- Respect system Do Not Disturb settings

### Notification Generation

Notifications are created server-side when events occur:
- Lead webhook receives a new lead → create notification
- Cron job checks for due follow-ups → create notification batch
- Quote status update → create notification
- Invoice payment recorded → create notification

### Database Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications` | GET | List notifications (paginated, unread first) |
| `/api/notifications/unread-count` | GET | Get unread count (polled every 30s) |
| `/api/notifications/[id]/read` | PUT | Mark as read |
| `/api/notifications/read-all` | PUT | Mark all as read |

---

## 10. Feature 9: Global Search & Command Palette

### Overview
A Cmd+K powered command palette for instant navigation and actions from anywhere in the app.

### Component: `src/components/layout/CommandBar.tsx`

### Search Categories

| Category | Searchable Fields | Icon |
|----------|------------------|------|
| **Leads** | customer_name, phone, email, city | `Users` |
| **Quotations** | title, reference, client.name, destination | `FileText` |
| **Templates** | name, destination, category | `Layout` |
| **Pages** | Dashboard, Leads, Quotations, Analytics, Calendar, Catalog, Settings | `Link` |
| **Actions** | New Quote, AI Generate, Sync Leads, New Lead, New Template | `Zap` |

### Behavior
1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) → overlay opens
2. Type to search → results appear instantly (debounced 150ms)
3. Results grouped by category with section headers
4. Arrow keys to navigate, Enter to select
5. Escape to close
6. Recent searches shown when empty

### API Endpoint

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/search` | GET | Global search across leads, quotations, templates |

### Implementation Notes
- Client-side fuzzy matching for pages and actions (no API call needed)
- API call for leads and quotations search (server-side Supabase full-text search)
- Debounced input (150ms) to prevent excessive API calls
- Keyboard-navigable with `aria-activedescendant`

---

## 11. Feature 10: Notes & Internal Communication

### Overview
Add a notes system for internal team communication on leads and quotations.

### Note Data Model

```typescript
interface Note {
  id: string;
  content: string;        // markdown supported
  entity_type: 'lead' | 'quotation';
  entity_id: string;
  author_name: string;    // free-text (no auth system)
  pinned: boolean;
  created_at: string;
  updated_at: string;
}
```

### Features
- Add notes on lead detail page (Notes tab)
- Add notes on quotation editor (Notes section)
- Pin important notes to top
- Markdown formatting support
- Timestamps and author attribution
- Edit and delete own notes

### Database Table

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'quotation')),
  entity_id TEXT NOT NULL,
  author_name TEXT DEFAULT '',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notes` | GET, POST | List notes for entity, create note |
| `/api/notes/[id]` | PUT, DELETE | Update or delete a note |
| `/api/notes/[id]/pin` | PUT | Toggle pin status |

---

## 12. Feature 11: Enhanced AI Capabilities

### Overview
Amplify QMS's unique AI advantage with improvements that no competitor offers.

### Enhancement 1: Template-Based AI Generation
- Select a template before AI generates → AI fills the template with client-specific data
- Results in more consistent, higher-quality quotes
- Template constrains the structure; AI provides the details

### Enhancement 2: AI-Powered Lead Insights
- After logging a call, AI suggests:
  - Recommended budget range based on destination + pax + hotel category
  - Similar past quotations for reference
  - Best follow-up time based on historical conversion data
  - Suggested activities based on travel month and traveler type

### Enhancement 3: Smart Follow-up Suggestions
- AI analyzes lead status + call history + time elapsed
- Suggests: "This lead has been warm for 5 days. Consider sending a follow-up with a 5% early-bird discount."
- Generate follow-up message templates based on context

### Enhancement 4: Quotation Quality Score
- AI evaluates a draft quotation and provides a quality score (1-10):
  - Completeness (all sections filled)
  - Pricing competitiveness (compared to similar quotes)
  - Itinerary balance (variety of activities, reasonable pacing)
  - Missing items (visa, flights, meals commonly expected)
- Displayed as a badge in the editor with improvement suggestions

### Enhancement 5: Competitive Pricing Intelligence
- Show margin comparison: "This quote's margin (18%) is above your average for Dubai quotes (15%)"
- Flag if pricing is unusually high or low compared to historical data
- Suggest optimal markup based on lead's budget category

### Implementation Notes
- These features use the existing AI providers (Claude, GPT, etc.)
- New API endpoints for each capability
- Results cached per quotation/lead to avoid repeated API calls
- Cost-conscious: use Groq (fastest, cheapest) for simple tasks, Claude for complex analysis

---

## 13. Feature 12: Settings & Configuration

### New Page: `/settings`

**File**: `src/pages/settings.astro`

### Settings Sections

#### Appearance
- Theme: Light / Dark / System
- Sidebar: Left / Right (future consideration)
- Compact mode: Reduce spacing for dense data views

#### Defaults
- Default quote currency (INR / AED / USD)
- Default markup percentages by line type
- Default AI provider and model
- Default payment policy template
- Default inclusions/exclusions

#### Company Info
- Company name and tagline
- Addresses (UAE + India)
- Contact info (email, WhatsApp numbers, website)
- Logo upload (currently referenced by URL)

#### Integrations
- **Google Sheets**: Sheet ID, Tab name, API key status, last sync time, auto-sync toggle
- **Facebook Ads**: Webhook URL, verify token, page access token status, test button
- **Email** (new): Provider (Resend/SendGrid), API key, from address, test button
- **WhatsApp**: Phone numbers, message templates

#### Data Management
- Export all data (leads, quotations, templates) as JSON/CSV
- Import catalog from CSV
- Clear notification history
- Database health check

### Storage
Settings stored in a `settings` table in Supabase or a `data/settings.json` file (following the dual-storage pattern).

---

## 14. Database Schema Changes

### Summary of All New Tables

```sql
-- Templates for quotations
CREATE TABLE templates ( ... );

-- Tasks linked to calendar
CREATE TABLE tasks ( ... );

-- Catalog tables (migrate from JSON)
CREATE TABLE catalog_products ( ... );
CREATE TABLE catalog_transport ( ... );
CREATE TABLE catalog_city_tours ( ... );
CREATE TABLE catalog_hotels ( ... );

-- Invoice tracking
CREATE TABLE invoices ( ... );

-- In-app notifications
CREATE TABLE notifications ( ... );

-- Internal notes
CREATE TABLE notes ( ... );

-- App settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration Strategy
1. Create new migration file: `supabase/migrations/003_features.sql`
2. All new tables are additive (no changes to existing tables)
3. Add commission fields to quotations data JSONB (no schema change needed — it's already JSONB)
4. Catalog migration is optional (JSON files continue to work as fallback)

---

## 15. Implementation Priority Matrix

| Feature | Business Impact | Effort | Priority | Sprint |
|---------|----------------|--------|----------|--------|
| Drag-and-drop (itinerary) | High | Medium | P1 | Sprint 5 |
| Drag-and-drop (kanban) | High | Medium | P1 | Sprint 4 |
| Analytics Dashboard | High | High | P1 | Sprint 3 |
| Notification System | High | Medium | P2 | Sprint 6 |
| Templates Library | High | Medium | P2 | Sprint 7 |
| Calendar & Tasks | Medium | Medium | P2 | Sprint 7 |
| Supplier Catalog Admin | Medium | High | P2 | Sprint 8 |
| Global Search (Cmd+K) | Medium | Low | P2 | Sprint 2 |
| Notes System | Medium | Low | P3 | Sprint 6 |
| Email Integration | Medium | Medium | P3 | Sprint 8 |
| Commission Tracking | Low | Medium | P3 | Sprint 9 |
| Invoice System | Low | High | P3 | Sprint 9 |
| AI Enhancements | Medium | High | P3 | Sprint 10 |
| Settings Page | Low | Low | P3 | Sprint 6 |

---

## 16. Implementation Roadmap

### Phase A: Foundation + Core Redesign (Weeks 1-6)
*Covered in UIUX_IMPROVEMENT_PLAN.md — design system, navigation, dark mode, dashboard*

### Phase B: Core Feature Upgrades (Weeks 7-10)
- **Sprint 4** (Week 7-8): Drag-and-drop kanban + lead pipeline redesign
- **Sprint 5** (Week 9-10): Drag-and-drop editor + quotation list redesign + AI generator redesign

### Phase C: New Features — Priority 1 (Weeks 11-14)
- **Sprint 6** (Week 11-12): Notification system + Notes system + Settings page + Polish
- **Sprint 7** (Week 13-14): Templates library + Calendar & Task management

### Phase D: New Features — Priority 2 (Weeks 15-18)
- **Sprint 8** (Week 15-16): Supplier catalog management + Email integration
- **Sprint 9** (Week 17-18): Commission tracking + Invoice system

### Phase E: Advanced Features (Weeks 19-20)
- **Sprint 10** (Week 19-20): AI enhancements + Performance optimization + Final QA

### Total Estimated Timeline: ~20 weeks (5 months)

---

## Technical Notes

### Dependencies to Add
```json
{
  "dependencies": {
    "lucide-react": "^0.x",
    "recharts": "^2.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "@dnd-kit/utilities": "^3.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "resend": "^4.x",
    "date-fns": "^4.x"
  },
  "devDependencies": {
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x"
  }
}
```

### Performance Considerations
- Lazy-load chart library (Recharts) — only on analytics and dashboard pages
- Lazy-load drag-and-drop (@dnd-kit) — only on editor and kanban pages
- Use Astro's partial hydration (`client:visible` for below-fold components)
- Implement virtual scrolling for long lists (leads > 500, catalog > 1000)
- Cache analytics queries server-side (5-minute TTL)
- Debounce all search inputs (150ms)
- Throttle notification polling (30s intervals)

### Testing Strategy
- Existing Vitest tests continue to pass (pricing engine, schema validation)
- Add component tests for new UI components
- Manual testing checklist for each sprint
- Cross-browser testing: Chrome, Safari, Firefox, Edge
- Mobile testing: iOS Safari, Android Chrome
- Dark mode testing on every page
- Accessibility audit with axe DevTools

---

*This feature plan, combined with the UI/UX improvement plan, transforms QMS from a functional quotation tool into a comprehensive travel business management platform — while preserving and amplifying its unique AI-powered competitive advantage.*
