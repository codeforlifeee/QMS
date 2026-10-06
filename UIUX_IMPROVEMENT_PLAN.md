# QMS UI/UX Improvement Plan

> **Traverse Globe — Quotation Maker Service**
> Complete UI/UX overhaul to transform QMS from a utilitarian internal tool into a modern, mobile-first, Stripe-inspired SaaS experience.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Competitive Landscape](#2-competitive-landscape)
3. [Design Vision & Principles](#3-design-vision--principles)
4. [Phase 1: Design System Foundation](#4-phase-1-design-system-foundation)
5. [Phase 2: Navigation & Layout Overhaul](#5-phase-2-navigation--layout-overhaul)
6. [Phase 3: Dark Mode Implementation](#6-phase-3-dark-mode-implementation)
7. [Phase 4: Page-by-Page Redesign](#7-phase-4-page-by-page-redesign)
8. [Phase 5: Mobile-First Responsive Design](#8-phase-5-mobile-first-responsive-design)
9. [Phase 6: Loading States, Empty States & Micro-Interactions](#9-phase-6-loading-states-empty-states--micro-interactions)
10. [Phase 7: Accessibility](#10-phase-7-accessibility)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Technical Architecture](#12-technical-architecture)

---

## 1. Current State Analysis

### 1.1 Existing Pages Inventory

| Page | Route | Current State | Key Issues |
|------|-------|---------------|------------|
| **Dashboard** | `/` | Stats bar + quick action cards + recent lists | Plain stats (no charts), emoji icons, no data visualization, no activity feed |
| **Leads Pipeline** | `/leads` | Kanban board + list view | No drag-and-drop between columns, basic filter panel, no inline editing |
| **Lead Detail** | `/leads/[id]` | Contact info + call history + linked quotes | No tabs, long scrolling page, modal-only forms, no timeline view |
| **Quotation List** | `/quotations` | Card/table view with filters | Basic cards, no bulk actions, no template gallery, no thumbnail previews |
| **AI Generator** | `/quotations/generate` | 3-step prompt builder | No progress animation, abrupt transitions, plain loading spinner |
| **Quotation Editor** | `/edit/[id]` | Split-pane form + preview | Not responsive (min 880px), up/down arrow reordering (no drag-drop), cramped layout |
| **Share Page** | `/q/[token]` | Public quotation document | Functional but lacks branding polish |
| **Print Page** | `/print/[token]` | Zero-JS PDF render | No changes planned (working well) |
| **Privacy** | `/privacy` | Static text page | Minimal, needs brand styling |

### 1.2 Current Technical Stack

- **Framework**: Astro 5.18 + React 19 islands
- **Styling**: 2,400+ lines of hand-written plain CSS (no framework)
- **Icons**: Unicode emoji characters (&#128101;, &#9889;, etc.)
- **Fonts**: System font stack (Segoe UI, -apple-system, etc.)
- **Colors**: 9 CSS custom properties (orange, ink, teal, etc.)
- **Layout**: Top-bar navigation only, no sidebar
- **Responsive**: Limited (editor completely non-responsive, kanban partially responsive)
- **Dark Mode**: None
- **Component Library**: None
- **Accessibility**: Minimal (few ARIA labels, no focus management)

### 1.3 Key UI/UX Problems

1. **Looks outdated** — No component library, emoji icons, system fonts, plain cards
2. **Not mobile-friendly** — Editor needs 880px minimum, kanban overflows on small screens
3. **Navigation is limited** — Only 3 top-bar links (Dashboard, Leads, Quotations), no room for new sections
4. **No visual hierarchy** — Stats are plain numbers without context (no trends, sparklines, or charts)
5. **Inconsistent patterns** — Mix of BEM-ish classes, inline styles, and scoped styles
6. **Missing polish** — No skeleton screens, basic loading spinners, browser `alert()` dialogs
7. **No branding** — No logo displayed, no favicon, text-only brand name
8. **CitationBadge bug** — Uses Tailwind classes but Tailwind isn't installed (renders unstyled)

---

## 2. Competitive Landscape

### 2.1 What Top Platforms Offer That QMS Lacks

| Feature | Travefy | Ezus | TravelJoy | QuoteCloud | QMS |
|---------|---------|------|-----------|------------|-----|
| Drag-and-drop itinerary builder | Yes | Yes | No | Yes | No |
| Reusable templates library | Yes | Yes | Yes | Yes | No |
| Client-facing portal | Yes | Yes | Yes | No | Partial (share link only) |
| Real analytics dashboard | Yes | Yes | Basic | No | No (counts only) |
| Calendar integration | Yes | Yes | Yes | No | No |
| Commission tracking | Yes | Yes | No | No | No |
| Invoicing | No | Yes | Yes | No | No |
| Email sending from app | Yes | No | Yes | No | No |
| Supplier catalog admin | No | Yes | No | No | No (JSON files only) |
| In-app notifications | Yes | Yes | Yes | Yes | Toast only |
| Mobile app / responsive | Yes | Yes | Yes | No | Partial |
| Dark mode | No | No | No | No | No |
| Global search | No | Yes | No | No | No |
| Multi-currency budgeting | No | Yes | No | No | Yes |
| AI quotation generation | No | No | No | Yes | Yes |
| Real-time margin tracking | No | Yes | No | No | Yes |

### 2.2 QMS Unique Strengths (Keep & Enhance)

- **AI-powered quotation generation** — 4-step pipeline with catalog grounding (no competitor matches this)
- **AI chat agent** — In-editor assistant that proposes changes with catalog citations
- **Precision pricing engine** — BigInt arithmetic with multi-currency support, zero floating-point errors
- **Multi-provider AI** — Claude, OpenAI, Groq, Gemini support
- **Pixel-perfect PDF** — Puppeteer server-side rendering with physical-unit CSS

### 2.3 Modern SaaS Design Patterns to Adopt (2026 Trends)

- **Progressive disclosure** — Surface the one metric that answers "is everything okay?" first
- **Quiet chrome, high density** — Reduce visual noise while showing more data
- **AI-native interfaces** — AI summaries and suggested actions as first-class UI components
- **Dark-mode-first tools** — Essential for daily-use professional tools
- **Excellent tables over chart-heavy layouts** — Tables with inline actions, sorting, filtering
- **Modular/composable dashboards** — Role-based views, rearrangeable widgets
- **Command palette (Cmd+K)** — Quick navigation and actions from keyboard

---

## 3. Design Vision & Principles

### 3.1 Design Identity

**"Clean & Minimal but Rich & Data-Driven with a Bold, Modern edge"**

Inspired by **Stripe Dashboard**: premium feel, clear information hierarchy, beautiful data visualization, sharp typography, subtle gradients and shadows.

### 3.2 Brand Integration

From the Traverse Globe brand guidelines:

| Element | Value |
|---------|-------|
| **Primary Logo** | `/logo.webp` (light backgrounds) |
| **Dark Mode Logo** | `/logo-white-text.png` (dark backgrounds) |
| **Logo Dimensions** | 766 x 304 px (rendered responsively) |
| **Primary Font** | `Poppins` (headings, buttons, emphasized elements) |
| **Secondary Font** | `Inter` (body copy, descriptions — fallback for Canva Sans) |
| **Brand Orange** | `#FF5B04` — CTAs, buttons, badges, active states |
| **Brand Teal** | `#075056` — Secondary accents, gradients |
| **Trust Green** | `#10B981` — Success states, positive indicators |
| **Surface** | `#FFFFFF` — Cards, containers |
| **Canvas** | `#F8FAFC` — Page background |
| **Ink** | `#0F172A` — Primary text |
| **Muted Ink** | `#475569` — Secondary text |
| **Hairline** | `#E2E8F0` — Borders, dividers |
| **Corner Radii** | `1rem` (16px) to `1.25rem` (20px) — rounded-2xl |
| **Shadows** | Soft, diffused — no harsh contrasts |

### 3.3 Design Principles

1. **Mobile-first** — Design for phone screens first, enhance for desktop
2. **Progressive disclosure** — Show what's essential, reveal details on demand
3. **Consistency** — Every button, card, badge follows the same design tokens
4. **Speed** — Skeleton screens, optimistic updates, instant feedback
5. **Clarity** — One primary action per view, clear visual hierarchy
6. **Accessibility** — WCAG 2.1 AA compliance as a minimum target

---

## 4. Phase 1: Design System Foundation

### 4.1 Install Dependencies

```bash
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities class-variance-authority clsx tailwind-merge
```

**Package purposes:**
- `tailwindcss` + `@tailwindcss/vite` — Utility-first CSS framework with Vite integration
- `lucide-react` — Beautiful, consistent icon library (replaces emoji icons)
- `recharts` — React chart library for analytics (lightweight, composable)
- `@dnd-kit/core` + `@dnd-kit/sortable` — Modern drag-and-drop for kanban and editor
- `class-variance-authority` (CVA) — Type-safe component variants
- `clsx` + `tailwind-merge` — Utility for conditional class merging

### 4.2 Tailwind Configuration

Create `tailwind.config.ts` (or `src/styles/app.css` with `@theme`):

```
Brand Colors:
  orange: #FF5B04 (primary)
  teal: #075056 (secondary)
  green: #10B981 (success/trust)
  ink: #0F172A (text)
  muted: #475569 (secondary text)
  hairline: #E2E8F0 (borders)
  canvas: #F8FAFC (background)
  surface: #FFFFFF (cards)
  destructive: #EF4444 (errors/danger)
  warning: #F59E0B (warnings)

Dark Mode Colors:
  canvas: #0B0F1A
  surface: #111827
  surface-raised: #1F2937
  ink: #F1F5F9
  muted: #94A3B8
  hairline: #1E293B

Fonts:
  heading: Poppins, sans-serif
  body: Inter, system-ui, sans-serif

Border Radius:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px

Shadows:
  soft-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)
  soft-md: 0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)
  soft-lg: 0 10px 15px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.06)
  soft-xl: 0 20px 25px rgba(0,0,0,0.06), 0 8px 10px rgba(0,0,0,0.04)
```

### 4.3 Astro Integration

Update `astro.config.mjs`:
- Add `@tailwindcss/vite` plugin to Vite config
- Ensure Tailwind processes `.astro` and `.tsx` files

### 4.4 Google Fonts

Add Poppins and Inter via Google Fonts link in the layout `<head>`:
- Poppins: weights 400, 500, 600, 700
- Inter: weights 400, 500, 600

### 4.5 shadcn/ui-Style Component Library

Create reusable components in `src/components/ui/` using CVA for variants:

| Component | File | Variants |
|-----------|------|----------|
| **Button** | `Button.tsx` | primary, secondary, ghost, danger, outline; sizes: sm, md, lg |
| **Card** | `Card.tsx` | default, elevated, interactive (hover lift) |
| **Badge** | `Badge.tsx` | default, success, warning, danger, info; sizes: sm, md |
| **Input** | `Input.tsx` | default, error state; with label + helper text |
| **Select** | `Select.tsx` | native dropdown with consistent styling |
| **Textarea** | `Textarea.tsx` | auto-growing, with character count |
| **Modal** | `Modal.tsx` | dialog with backdrop, focus trap, Escape to close |
| **Toast** | `Toast.tsx` | success, error, warning, info; auto-dismiss + action button |
| **Tooltip** | `Tooltip.tsx` | hover/focus tooltip with arrow |
| **Tabs** | `Tabs.tsx` | horizontal tabs with underline indicator |
| **Dropdown** | `Dropdown.tsx` | action menu with keyboard navigation |
| **Avatar** | `Avatar.tsx` | initials or image, sizes: sm, md, lg |
| **Skeleton** | `Skeleton.tsx` | animated placeholder for loading states |
| **EmptyState** | `EmptyState.tsx` | icon + title + description + CTA button |
| **StepIndicator** | `StepIndicator.tsx` | numbered steps with active/complete/pending states |
| **DataTable** | `DataTable.tsx` | sortable, filterable table with pagination |
| **KPICard** | `KPICard.tsx` | stat value + label + trend indicator + sparkline |
| **SearchInput** | `SearchInput.tsx` | search with debounce, clear button, loading state |
| **SegmentedControl** | `SegmentedControl.tsx` | button group for view toggles (Board/List, Card/Table) |
| **Chip** | `Chip.tsx` | filter chips with active state, removable |
| **ProgressBar** | `ProgressBar.tsx` | animated, colored by threshold |

### 4.6 Utility Function: `cn()`

Create a `cn()` helper (`src/lib/cn.ts`) that merges Tailwind classes with conflict resolution:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 4.7 Icon System

Replace all Unicode emoji icons with Lucide React icons:

| Current Emoji | Lucide Replacement | Context |
|---------------|-------------------|---------|
| &#128101; (people) | `Users` | View Leads action card |
| &#9889; (lightning) | `Sparkles` | AI Generate action card |
| &#128196; (document) | `FilePlus` | Manual Quote action card |
| &#128203; (clipboard) | `FileText` | All Quotations action card |
| &#8635; (refresh) | `RefreshCw` | Sync Leads action card |
| &times; (close) | `X` | Modal/panel close buttons |
| &larr; (back) | `ArrowLeft` | Back navigation |
| ↑ / ↓ (arrows) | `GripVertical` | Drag handle (replaces move buttons) |
| ▲ / ▼ (expand) | `ChevronDown` | Expandable sections |
| "AI" text | `Bot` | Chat panel icon |
| "S" text | `BookOpen` | Sources panel icon |

**Additional icons for new features:**
- `LayoutDashboard` — Dashboard nav
- `Contact` — Leads nav
- `FileText` — Quotations nav
- `BarChart3` — Analytics nav
- `Calendar` — Calendar nav
- `Package` — Catalog nav
- `Receipt` — Invoices nav
- `Settings` — Settings nav
- `Search` — Global search
- `Bell` — Notifications
- `Sun` / `Moon` — Theme toggle
- `PanelLeftClose` / `PanelLeftOpen` — Sidebar collapse
- `Plus` — Create/add actions
- `MoreHorizontal` — Action menus
- `Trash2` — Delete actions
- `Copy` — Duplicate
- `ExternalLink` — Open in new tab
- `Download` — PDF download
- `Send` — Share/send
- `Phone` — Call actions
- `MessageCircle` — WhatsApp
- `Mail` — Email
- `Filter` — Filter toggle
- `SortAsc` / `SortDesc` — Sort indicators
- `Check` — Success/selected
- `AlertTriangle` — Warnings
- `AlertCircle` — Errors
- `Info` — Info tooltips
- `Grip` — Drag handle
- `ChevronRight` — Breadcrumb separator

---

## 5. Phase 2: Navigation & Layout Overhaul

### 5.1 New Layout Architecture

Replace the current top-bar-only layout (`Shell.astro`) with a modern sidebar + top-bar layout:

```
+------------------------------------------------------------------+
| [Logo]  [Breadcrumbs.................]  [Search] [Bell] [Theme] |
+--------+---------------------------------------------------------+
|        |                                                         |
| [icon] |                                                         |
| Dash   |              Main Content Area                          |
|        |                                                         |
| [icon] |              (scrollable)                               |
| Leads  |                                                         |
|        |                                                         |
| [icon] |                                                         |
| Quotes |                                                         |
|        |                                                         |
| [icon] |                                                         |
| AI Gen |                                                         |
|        |                                                         |
|--------|                                                         |
| [icon] |                                                         |
| Analyt |                                                         |
|        |                                                         |
| [icon] |                                                         |
| Calend |                                                         |
|        |                                                         |
| [icon] |                                                         |
| Catalo |                                                         |
|        |                                                         |
|--------|                                                         |
| [icon] |                                                         |
| Settin |                                                         |
+--------+---------------------------------------------------------+
```

### 5.2 Sidebar Component (`src/components/layout/Sidebar.tsx`)

**Features:**
- Collapsible: full labels (240px) → icons only (64px) → hidden (mobile overlay)
- Keyboard shortcut: `Cmd+B` / `Ctrl+B` to toggle
- Persist collapsed state in `localStorage`
- Active route highlighting with orange left border indicator
- Grouped sections with subtle dividers:
  - **Main**: Dashboard, Leads, Quotations, AI Generator
  - **Tools**: Analytics, Calendar, Catalog, Invoices
  - **System**: Settings
- Bottom section: collapse/expand button + version info
- Mobile: overlay sidebar with backdrop, swipe to close
- Smooth transition animations (width, opacity)

### 5.3 Top Bar Redesign (`src/components/layout/TopBar.tsx`)

**Features:**
- Left: Hamburger menu (mobile) + breadcrumb trail
- Center: Global search trigger button showing `Cmd+K`
- Right: Notification bell (with unread count badge) + Theme toggle (Sun/Moon) + User avatar/initials
- Height: 56px (slightly taller than current 50px for breathing room)
- Subtle bottom border, no heavy shadow
- Transparent/blurred background on scroll (glassmorphism effect)

### 5.4 Breadcrumbs

Dynamic breadcrumb trail based on current route:
- Dashboard (always home)
- Leads → Lead Detail → Generate Quote
- Quotations → Edit Quotation
- Contextual: show lead name, quotation title in breadcrumbs

### 5.5 Command Palette / Global Search (`src/components/layout/CommandBar.tsx`)

**Features:**
- Trigger: `Cmd+K` / `Ctrl+K` or click search bar
- Full-screen overlay with centered search modal
- Search across: Leads (by name, phone, city), Quotations (by title, reference, client), Pages (Dashboard, Settings, etc.)
- Recent searches section
- Keyboard navigation (arrow keys + Enter)
- Grouped results with icons
- Debounced search with loading indicator

### 5.6 Layout Wrapper Update

The new `Shell.astro` should:
1. Import global Tailwind styles
2. Load Google Fonts (Poppins + Inter)
3. Include Sidebar as a React island (`client:load`)
4. Include TopBar as a React island
5. Include CommandBar as a React island
6. Wrap content in `<main>` with proper padding/margins based on sidebar state
7. Add `<meta>` for favicon and PWA manifest
8. Add dark mode class management on `<html>`

**Sidebar state** should be passed to the content area via CSS custom properties or a context, so the main content adjusts its left margin when sidebar collapses.

---

## 6. Phase 3: Dark Mode Implementation

### 6.1 Strategy: CSS Class-Based (`dark` class on `<html>`)

Use Tailwind's `class` strategy for dark mode (not `media`), allowing manual toggle:

```
<html class="dark"> → dark mode
<html class="">     → light mode
```

### 6.2 Color Token Mapping

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--canvas` | `#F8FAFC` | `#0B0F1A` |
| `--surface` | `#FFFFFF` | `#111827` |
| `--surface-raised` | `#FFFFFF` | `#1F2937` |
| `--ink` | `#0F172A` | `#F1F5F9` |
| `--muted` | `#475569` | `#94A3B8` |
| `--hairline` | `#E2E8F0` | `#1E293B` |
| `--tint` | `#F1F5F9` | `#1E293B` |
| `--orange` | `#FF5B04` | `#FF6B1A` (slightly brighter for dark bg) |
| `--teal` | `#075056` | `#0D9488` (brighter teal for dark bg) |
| `--good` | `#15803D` | `#22C55E` |
| `--bad` | `#B91C1C` | `#EF4444` |
| `--shadow-color` | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.3)` |

### 6.3 Theme Toggle Logic

```
1. On first load: check localStorage('theme')
   - If 'dark' → apply dark class
   - If 'light' → apply light class
   - If null → check system preference via matchMedia('(prefers-color-scheme: dark)')
2. Toggle button cycles: Light → Dark → System (auto)
3. Save preference to localStorage
4. Icon changes: Sun → Moon → Monitor
5. Transition: add 'transition-colors duration-200' to html element during toggle
```

### 6.4 Logo Switching

- Light mode: Display `/logo.webp`
- Dark mode: Display `/logo-white-text.png`
- Use a CSS class or React conditional render based on theme state

### 6.5 Files Requiring Dark Mode Attention

- All page backgrounds and card surfaces
- Input fields, textareas, select dropdowns
- Modal overlays and backdrops
- Chart colors (ensure readability on dark backgrounds)
- Status badges and pills (ensure contrast)
- Kanban board column backgrounds
- Quotation editor split pane
- Toast notifications
- **Excluded**: `document.css` (PDF template stays light — print media)

---

## 7. Phase 4: Page-by-Page Redesign

### 7.1 Dashboard (`/` — `src/pages/index.astro`)

**Current**: 5 plain stat cards + 5 emoji quick-action tiles + 2 recent lists

**Redesigned Dashboard Layout:**

```
+------------------------------------------------------------------+
| Good morning! Here's your day at a glance.          [Oct 6, 2026] |
+------------------------------------------------------------------+
|                                                                    |
| [KPI Card]    [KPI Card]    [KPI Card]    [KPI Card]    [KPI]    |
| Total Leads   Hot Leads     In Progress   Follow-ups    Quotes   |
| 247 +12%      34 ↑8         18            7 due today   156      |
| [sparkline]   [sparkline]   [sparkline]   [urgent dot]  [spark]  |
|                                                                    |
+------------------------------+-------------------------------------+
| Lead Conversion Funnel       | Revenue This Month                  |
| [horizontal bar chart]       | [area chart with gradient fill]     |
| Untouched → Hot → Quoted     | INR total with daily breakdown      |
|   → Converted                |                                     |
+------------------------------+-------------------------------------+
| Lead Sources                 | Quick Actions                       |
| [donut chart]                | [+ New Quote] [AI Generate]         |
| Meta: 45%                   | [View Leads]  [Sync Now]            |
| Google Sheet: 30%            | [Templates]   [Calendar]            |
| Direct: 15% | Other: 10%    |                                     |
+------------------------------+-------------------------------------+
| Activity Feed                | Upcoming Follow-ups                 |
| [timeline with avatars]      | [calendar-style list]               |
| 10:30 — New lead: John D.   | Today: 3 calls                      |
| 09:15 — Quote sent: Dubai 5N | Tomorrow: 5 calls                  |
| Yesterday — Lead converted   | This week: 12 total                |
+------------------------------+-------------------------------------+
```

**Key changes:**
- KPI cards with sparkline trends (last 7/30 days)
- Percentage change indicators (↑12% in green, ↓5% in red)
- Real charts using Recharts (conversion funnel, revenue area, lead source donut)
- Activity feed with timeline format
- Upcoming follow-ups section
- Greeting with date
- Responsive: stacks to single column on mobile

### 7.2 Leads Pipeline (`/leads` — `src/pages/leads/index.astro` + `src/crm/PipelineView.tsx`)

**Current**: Kanban board with 6 columns OR table view, basic filters, add lead modal

**Redesigned Leads Page:**

**Board View (Kanban):**
- Drag-and-drop cards between columns using `@dnd-kit`
- Column headers show count + collapsed summary stats
- Cards show: avatar initials, name, city, last activity, priority dot, quick-action icons (call, WhatsApp, email)
- Card hover: subtle lift with shadow
- New card animation: slide in from top
- Inline quick status change (right-click or action menu)
- Column scroll: individual column scrolling when content overflows

**List View (Table):**
- Proper DataTable with sortable columns
- Inline editing for status/priority
- Row hover actions (Call, WhatsApp, View, Edit)
- Multi-select with bulk actions (change status, assign, delete)
- Pagination with page size selector
- Column visibility toggle

**Filter Bar (redesigned):**
- Horizontal filter chips instead of collapsible panel
- Active filters shown as removable chips
- "Clear all" button when filters are active
- Saved filter presets (Quick Filters: "My Hot Leads", "Follow-ups Due", "This Week's New")
- Search with instant highlight

**Add Lead:**
- Slide-over drawer from right instead of modal
- Better form layout with sections
- Phone number validation with country code
- Email validation
- Auto-suggest for city field

### 7.3 Lead Detail (`/leads/[id]` — `src/pages/leads/[id].astro` + `src/crm/LeadPage.tsx`)

**Current**: Single scrolling page with info grid, call history list, linked quotations

**Redesigned Lead Detail:**

```
+------------------------------------------------------------------+
| ← Back to Leads    John Doe                    [Call] [WA] [Edit]|
|                     Dubai · Meta · My Hot                         |
+------------------------------------------------------------------+
| [Overview]  [Call History]  [Quotations]  [Activity]  [Notes]    |
+------------------------------------------------------------------+
|                                                                    |
| Tab content area (changes based on selected tab)                  |
|                                                                    |
+------------------------------------------------------------------+
```

**Overview Tab:**
- Contact card with name, phone (click-to-call), email, city, pax summary
- Travel details card: destination, dates, hotel preference, budget
- Key stats: total calls, total quotes, days since first contact
- Next follow-up with countdown

**Call History Tab:**
- Visual timeline with date markers
- Expandable call entries with full details
- Quick "Log Call" button → slide-over drawer form
- Status progression visualization

**Quotations Tab:**
- Grid of linked quotation cards with status badges
- "Generate Quote" and "Manual Quote" CTA buttons
- Total quoted value

**Activity Tab:**
- Combined timeline of all actions (calls, quotes, status changes)
- Filterable by type

**Notes Tab (NEW):**
- Free-text notes with timestamps
- Markdown support
- Pin important notes

### 7.4 Quotation List (`/quotations` — `src/pages/quotations.astro` + `src/components/QuotationList.tsx`)

**Current**: Status stats bar + card/table toggle + filter panel

**Redesigned Quotation List:**

**Stats Bar:**
- Horizontal pill-style tabs doubling as filters: All (156) | Draft (45) | Sent (38) | Accepted (12) | Expired (8) | Void (3)
- Click a status to filter immediately
- Active tab has orange underline

**Grid View (new default):**
- Larger cards with:
  - Destination hero thumbnail (if `heroImageUrl` exists)
  - Title + reference number
  - Client name + pax badge
  - Duration (nights) + travel dates
  - Grand total in large font
  - Status badge (colored)
  - Last updated timestamp
  - Quick actions: Edit, Duplicate, Share, PDF
- 3 columns on desktop, 2 on tablet, 1 on mobile

**Table View:**
- DataTable with sortable columns
- Inline status change dropdown
- Row actions menu
- Bulk select + actions (change status, duplicate, delete)

**New features:**
- "From Template" button → opens template gallery modal
- Search with instant filtering
- Sort by: newest, oldest, highest value, client name

### 7.5 Quotation Editor (`/edit/[id]` — `src/editor/Editor.tsx`)

**Current**: Fixed split-pane (form left, preview right), up/down arrow reordering, cramped on smaller screens

**Redesigned Editor:**

**Layout Options:**
- Desktop (>1200px): Side-by-side split pane (resizable divider)
- Tablet (768-1200px): Form full-width with floating preview toggle button → preview slides in as overlay
- Mobile (<768px): Form only with "Preview" tab at bottom → switches to preview mode

**Form Panel Improvements:**
- Collapsible sections with smooth animations:
  1. Client & Trip (always visible summary when collapsed)
  2. Itinerary Days (drag-and-drop reordering with `@dnd-kit`)
  3. Line Items (drag-and-drop, grouped by day)
  4. Pricing & Markup
  5. Discounts
  6. Terms & Conditions
- Floating action buttons: Save status indicator + AI Chat + Sources
- Better input styling with Tailwind
- Inline validation with error messages

**Day Editor Improvements:**
- Drag handle on left side of each day card
- Expand/collapse individual days
- "Add Day" button between days (insert at position)
- Day header shows: Day number, title, activity count
- Prose editor with formatting toolbar (bold, italic, bullet list)

**Line Item Improvements:**
- Drag-and-drop reordering within and between days
- Better visual hierarchy: line type icon + name + pricing summary
- Quick-edit inline (click to edit, blur to save)
- Grouped display by type (Hotels, Activities, Transfers, etc.)
- Catalog picker redesign: better search, recent picks, favorites

**Preview Panel:**
- Sticky header showing quotation reference
- Zoom controls (fit page, actual size)
- Quick scroll to section

**AI Chat Panel:**
- Slide-over from right (not inline panel)
- Better message bubbles with markdown rendering
- Typing indicator animation
- Suggested quick actions ("Add hotel", "Adjust markup", "Change dates")

**Autosave Indicator:**
- Subtle status in top-right: dot + text
  - Gray dot: Idle
  - Pulsing orange dot: Saving...
  - Green dot: Saved (fades after 2s)
  - Red dot: Error saving (with retry button)

### 7.6 AI Generator (`/quotations/generate` — `src/components/PromptBuilder.tsx`)

**Current**: 3-step wizard with basic transitions

**Redesigned Generator:**

**Step Indicator:**
- Horizontal stepper with icons and labels
- Completed steps show green checkmark
- Current step has orange highlight and pulse animation
- Lines connecting steps with progress fill

**Step 1 — Lead Review:**
- Card-based display of lead data
- Key travel details highlighted
- "Skip" option for manual entry

**Step 2 — Prompt Editor:**
- Rich textarea with helpful placeholders
- "AI Suggestions" sidebar with example prompts
- Token counter / complexity indicator
- Provider selector (Claude, GPT, Groq, Gemini) with model info

**Step 3 — Generation:**
- Full-screen generation progress view
- Animated pipeline visualization:
  - Step 1/4: Parsing intent... ✓
  - Step 2/4: Matching catalog... ✓ (42 items matched)
  - Step 3/4: Building quotation... ✓
  - Step 4/4: Narrating itinerary... (loading spinner)
- Stats cards appear as each step completes
- Warnings shown inline with yellow highlights
- "Open in Editor" CTA button on completion

### 7.7 Settings Page (NEW — `src/pages/settings.astro`)

**New page for user preferences:**

- **Appearance**: Theme toggle (Light/Dark/System), sidebar position (Left/Right)
- **Defaults**: Default currency, default markup percentages, default AI provider
- **Company**: Edit company name, addresses, contact info, logo upload
- **Integrations**: Google Sheets sync settings, Facebook webhook status, WhatsApp numbers
- **Data**: Export all data, import catalog, clear cache

---

## 8. Phase 5: Mobile-First Responsive Design

### 8.1 Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| **Mobile (sm)** | < 640px | Single column, bottom nav, stacked cards |
| **Tablet (md)** | 640-1024px | 2-column grids, sidebar overlay |
| **Desktop (lg)** | 1024-1440px | Full sidebar, split-pane editor |
| **Wide (xl)** | > 1440px | Extended content area, 3-column grids |

### 8.2 Mobile-Specific Patterns

**Navigation:**
- Bottom tab bar with 5 icons: Dashboard, Leads, Quotations, AI, More
- "More" opens action sheet with: Analytics, Calendar, Catalog, Settings
- Top bar: simplified with hamburger → full sidebar overlay

**Dashboard (mobile):**
- Horizontal scrolling KPI cards (swipe gesture)
- Stacked charts (one per row)
- Quick actions as horizontal icon row
- Activity feed as compact list

**Leads (mobile):**
- Default to list view (table too wide for mobile)
- Swipe actions on lead cards (left: call, right: WhatsApp)
- Floating "+" button for new lead
- Bottom sheet for filters instead of dropdown panel
- Pull-to-refresh to sync leads

**Quotation Editor (mobile):**
- Full-width form (no split pane)
- Bottom tab bar: Form | Preview | Chat | Sources
- Sticky save button at bottom
- Collapsible sections with tap-to-expand
- Line items as compact cards (tap to expand full editor)

**Lead Detail (mobile):**
- Sticky header with name + quick actions
- Horizontal tab bar (scrollable)
- Full-width content below

### 8.3 Touch Optimizations

- Minimum tap target: 44x44px (WCAG requirement)
- Touch-friendly drag handles (larger grab area)
- Swipe gestures for common actions
- No hover-only interactions (all hover effects have tap equivalents)
- Pull-to-refresh on list pages

---

## 9. Phase 6: Loading States, Empty States & Micro-Interactions

### 9.1 Skeleton Loading Screens

Replace "Loading leads..." text and spinner with skeleton screens on every page:

**Dashboard Skeleton:**
- 5 KPI card skeletons (pulsing gray rectangles)
- Chart area skeleton (gray rounded rectangle)
- List item skeletons (avatar circle + text lines)

**Leads Skeleton:**
- Kanban: column header skeletons + 3-4 card skeletons per column
- Table: header row + 10 row skeletons with varying widths

**Editor Skeleton:**
- Form panel: section header + 4-5 input field skeletons
- Preview panel: A4-shaped gray rectangle

**Skeleton component** (`src/components/ui/Skeleton.tsx`):
- Pulsing animation (opacity 0.3 → 0.7, 1.5s ease-in-out)
- Variants: text (rounded rectangle), circular (avatar), rectangular (image/chart)
- Matches the exact layout of the final content (prevents layout shift)

### 9.2 Empty States

Every list/collection page needs a meaningful empty state:

| Page | Empty State |
|------|------------|
| **Dashboard (no leads)** | Icon: `Compass`. "Start your journey". "Import your first leads from Google Sheets or add them manually." CTA: [Import Leads] [Add Lead] |
| **Leads (no leads)** | Icon: `Users`. "No leads yet". "Sync from Google Sheets, connect Facebook Ads, or add leads manually." CTA: [Sync Leads] [Add Lead] |
| **Leads (filtered, no results)** | Icon: `SearchX`. "No leads match your filters". "Try adjusting your search or clearing filters." CTA: [Clear Filters] |
| **Quotations (no quotes)** | Icon: `FileText`. "Create your first quotation". "Generate one with AI or build one manually." CTA: [AI Generate] [Manual Quote] |
| **Lead Detail (no calls)** | Icon: `Phone`. "No calls logged". "Log your first call to track this lead's progress." CTA: [Log Call] |
| **Lead Detail (no quotes)** | Icon: `FileText`. "No quotations linked". "Generate or create a quotation for this lead." CTA: [Generate Quote] |
| **Calendar (no events)** | Icon: `Calendar`. "Nothing scheduled". "Your follow-ups and deadlines will appear here." |
| **Notifications (none)** | Icon: `Bell`. "All caught up!". "You'll be notified about new leads, follow-ups, and quote updates." |

### 9.3 Micro-Interactions & Transitions

**Page Transitions:**
- Fade-in on route change (opacity 0 → 1, 150ms)
- Content slides up slightly (translateY 8px → 0)

**Card Interactions:**
- Hover: subtle lift (translateY -2px) + shadow increase (150ms ease)
- Click: brief scale down (0.98) → spring back (100ms)
- Drag: card elevates with larger shadow, slight rotation (2deg)

**Button Interactions:**
- Hover: background color shift (100ms)
- Active: scale 0.97 (50ms)
- Loading: text replaced with spinner, width preserved
- Success: brief green flash + checkmark icon

**Form Interactions:**
- Input focus: border color transition to orange (150ms) + subtle glow
- Error: border turns red + shake animation (3 cycles, 200ms)
- Success: brief green border flash on valid save

**Toast Notifications:**
- Slide in from top-right (300ms spring animation)
- Progress bar countdown for auto-dismiss
- Swipe to dismiss on mobile

**Sidebar:**
- Collapse: smooth width transition (200ms ease)
- Item hover: background color fade (100ms)
- Active indicator: orange left border slides in (150ms)

**Kanban Drag:**
- Card pickup: scale 1.02, shadow increases, opacity 0.9
- Drop zone: highlighted with dashed border
- Card drop: spring animation to final position

**Modal/Drawer:**
- Open: backdrop fades in + content slides up (250ms spring)
- Close: reverse animation (200ms ease)

**Data Updates:**
- Number changes: count-up/count-down animation
- New list items: slide in from top with fade
- Removed items: slide out + fade (200ms)

---

## 10. Phase 7: Accessibility

### 10.1 WCAG 2.1 AA Compliance Targets

**Keyboard Navigation:**
- All interactive elements reachable via Tab
- Logical tab order matching visual flow
- Visible focus indicators (orange ring, 2px offset)
- Escape key closes modals, drawers, dropdowns
- Arrow keys navigate within menus, tabs, kanban columns
- Enter/Space activates buttons and links

**Screen Reader Support:**
- Skip-to-content link as first focusable element
- `aria-label` on all icon-only buttons
- `aria-expanded` on collapsible sections
- `aria-live="polite"` for dynamic content (toasts, save status, loading)
- `aria-current="page"` on active navigation items
- `role="status"` for autosave indicator
- Descriptive `alt` text on all meaningful images
- `aria-describedby` linking error messages to inputs

**ARIA Roles:**
- Kanban board: `role="listbox"` with `role="option"` on cards
- Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Modals: `role="dialog"` with `aria-modal="true"`
- Sidebar: `role="navigation"` with `aria-label="Main navigation"`
- Search: `role="search"` with `role="combobox"` on the input
- Toast container: `role="alert"` or `aria-live="assertive"` for errors

**Focus Management:**
- Modal open: focus moves to first focusable element inside
- Modal close: focus returns to trigger element
- Focus trap inside modals (Tab cycles within modal)
- After form submission: focus moves to success/error message
- Route change: focus moves to main content heading

**Color & Contrast:**
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 for large text and icons
- Never use color alone to convey information (add icons/text)
- Status indicators: color + icon + text label

**Motion:**
- `prefers-reduced-motion` media query: disable all animations
- Fallback: instant state changes instead of transitions

---

## 11. Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
- [ ] Install Tailwind CSS, configure with brand colors and fonts
- [ ] Create `cn()` utility and base component library (Button, Card, Badge, Input, Modal)
- [ ] Set up Google Fonts (Poppins + Inter)
- [ ] Install Lucide icons, create icon mapping reference
- [ ] Build Skeleton component
- [ ] Add Traverse Globe logos to `public/` directory

### Sprint 2: Layout & Navigation (Week 3-4)
- [ ] Build Sidebar component with collapse/expand
- [ ] Build TopBar with breadcrumbs, search trigger, notification bell, theme toggle
- [ ] Rewrite `Shell.astro` layout with new sidebar + topbar structure
- [ ] Implement dark mode with theme toggle and localStorage persistence
- [ ] Add mobile bottom tab navigation
- [ ] Implement Command Palette (Cmd+K)

### Sprint 3: Dashboard Redesign (Week 5-6)
- [ ] Install Recharts
- [ ] Build KPICard component with sparklines
- [ ] Build chart components (conversion funnel, revenue area, lead source donut)
- [ ] Redesign Dashboard page with new layout
- [ ] Add activity feed component
- [ ] Add follow-ups section
- [ ] Mobile optimization for dashboard

### Sprint 4: Leads & CRM Redesign (Week 7-8)
- [ ] Install @dnd-kit, build drag-and-drop kanban board
- [ ] Redesign lead cards with action icons
- [ ] Build DataTable component for list view
- [ ] Redesign filter bar with chips
- [ ] Redesign Add Lead form as slide-over drawer
- [ ] Redesign Lead Detail page with tabs
- [ ] Mobile optimization for leads

### Sprint 5: Quotations Redesign (Week 9-10)
- [ ] Redesign quotation cards with thumbnails
- [ ] Build grid view for quotation list
- [ ] Add bulk actions to table view
- [ ] Redesign editor with responsive layout (mobile form-only mode)
- [ ] Add drag-and-drop to day and line item reordering
- [ ] Redesign AI chat panel as slide-over
- [ ] Redesign AI Generator with animated pipeline visualization

### Sprint 6: Polish & QA (Week 11-12)
- [ ] Add skeleton screens to all pages
- [ ] Add empty states to all list views
- [ ] Implement micro-interactions and transitions
- [ ] Accessibility audit and fixes
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile testing on real devices (iOS Safari, Android Chrome)
- [ ] Performance optimization (bundle size, lazy loading)
- [ ] Fix CitationBadge styling (currently uses non-existent Tailwind classes)

---

## 12. Technical Architecture

### 12.1 File Structure Changes

```
src/
  components/
    ui/                    ← NEW: shadcn/ui-style components
      Button.tsx
      Card.tsx
      Badge.tsx
      Input.tsx
      Select.tsx
      Textarea.tsx
      Modal.tsx
      Toast.tsx
      Tooltip.tsx
      Tabs.tsx
      Dropdown.tsx
      Avatar.tsx
      Skeleton.tsx
      EmptyState.tsx
      StepIndicator.tsx
      DataTable.tsx
      KPICard.tsx
      SearchInput.tsx
      SegmentedControl.tsx
      Chip.tsx
      ProgressBar.tsx
    layout/                ← NEW: layout components
      Sidebar.tsx
      TopBar.tsx
      CommandBar.tsx
      NotificationCenter.tsx
      MobileTabBar.tsx
      Breadcrumbs.tsx
    charts/                ← NEW: chart components
      AreaChart.tsx
      BarChart.tsx
      DonutChart.tsx
      Sparkline.tsx
      FunnelChart.tsx
    PromptBuilder.tsx      (existing — redesign)
    QuotationList.tsx      (existing — redesign)
    Toast.tsx              (existing — replace with ui/Toast.tsx)
  layouts/
    Shell.astro            (existing — complete rewrite)
  styles/
    app.css                (existing — replace with Tailwind base + custom utilities)
    crm.css                (existing — remove, replaced by Tailwind in components)
  lib/
    cn.ts                  ← NEW: class merge utility
    theme.ts               ← NEW: dark mode management
    notifications.ts       ← NEW: notification system
  ...
```

### 12.2 CSS Migration Strategy

**Approach: Incremental migration, not big-bang replacement**

1. Install Tailwind alongside existing CSS (both work in parallel)
2. New components use Tailwind exclusively
3. Existing components get migrated page-by-page as they're redesigned
4. Once all pages are migrated, remove `app.css` and `crm.css`
5. Keep `document.css` untouched (PDF template — no Tailwind here)

**Critical rule**: Tailwind must NOT leak into the PDF document rendering path. The `document.css` and `QuotationDocument.tsx` remain isolated with their own physical-unit CSS.

### 12.3 State Management for Layout

Use a simple React context + localStorage for cross-component state:

- **Theme**: `'light' | 'dark' | 'system'` → persisted in localStorage
- **Sidebar collapsed**: `boolean` → persisted in localStorage
- **Notification count**: in-memory state, refreshed on page load
- **Command palette open**: in-memory state

---

*This plan transforms QMS from a functional but utilitarian tool into a modern, polished SaaS application that the Traverse Globe team can use confidently on any device, at any time of day.*
