-- QMS Feature Improvement Plan - Phase C/D/E/F/G schema.
--
-- Additive migration. Nothing existing is dropped; the quotations and
-- leads tables keep their shapes. Commission fields live inside the
-- quotations.data JSONB column, so no quotation-table alteration is
-- needed for commission tracking.
--
-- The application today runs with JSON-file storage; this migration lets
-- Supabase take over without any API-route changes. Each table matches the
-- shape of the matching JSON file in `data/<namespace>/*.json`.

-- --------------------------------------------------------------------
-- Templates
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT 'General',
  destination    TEXT NOT NULL DEFAULT '',
  duration       INTEGER NOT NULL DEFAULT 0,
  thumbnail_url  TEXT,
  template_data  JSONB NOT NULL DEFAULT '{}',
  usage_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category    ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_destination ON templates(destination);

-- --------------------------------------------------------------------
-- Tasks (linked to calendar; optionally linked to a lead or quotation)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  due_date       DATE,
  due_time       TIME,
  priority       TEXT NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  lead_id        UUID,
  quotation_id   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_lead     ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_quote    ON tasks(quotation_id);

-- --------------------------------------------------------------------
-- Catalog (optional; the AI loader keeps reading data/catalog/*.json as a
-- fallback until these are populated. Minor units everywhere — fils/cents.)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_products (
  id              TEXT PRIMARY KEY,
  product         TEXT NOT NULL,
  location        TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  tour            TEXT NOT NULL DEFAULT '',
  transfer_option TEXT NOT NULL DEFAULT '',
  cost_aed        INTEGER NOT NULL DEFAULT 0,
  cost_usd        INTEGER NOT NULL DEFAULT 0,
  child_cost_aed  INTEGER,
  toddler_cost_aed INTEGER,
  supplier        TEXT NOT NULL DEFAULT '',
  source_sheet    TEXT,
  product_group   TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_location ON catalog_products(location);
CREATE INDEX IF NOT EXISTS idx_products_category ON catalog_products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON catalog_products(supplier);

CREATE TABLE IF NOT EXISTS catalog_transport (
  id            TEXT PRIMARY KEY,
  route         TEXT NOT NULL,
  vehicle_size  TEXT NOT NULL DEFAULT '',
  supplier      TEXT NOT NULL DEFAULT '',
  rate_aed      INTEGER NOT NULL DEFAULT 0,
  parking_aed   INTEGER,
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_route ON catalog_transport(route);

CREATE TABLE IF NOT EXISTS catalog_city_tours (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tour_type   TEXT NOT NULL DEFAULT 'sharing'
              CHECK (tour_type IN ('sharing', 'private')),
  duration    TEXT NOT NULL DEFAULT '',
  rate_aed    INTEGER NOT NULL DEFAULT 0,
  itinerary   JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_hotels (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  star_rating INTEGER NOT NULL DEFAULT 3
              CHECK (star_rating BETWEEN 1 AND 5),
  location    TEXT NOT NULL DEFAULT '',
  supplier    TEXT NOT NULL DEFAULT '',
  room_types  JSONB NOT NULL DEFAULT '[]',
  amenities   TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotels_location ON catalog_hotels(location);
CREATE INDEX IF NOT EXISTS idx_hotels_stars    ON catalog_hotels(star_rating);

-- --------------------------------------------------------------------
-- Invoices + payment history (payment_history stays inline as JSONB)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                TEXT PRIMARY KEY,
  invoice_number    TEXT UNIQUE NOT NULL,
  quotation_id      TEXT,
  lead_id           UUID,
  client_name       TEXT NOT NULL,
  client_email      TEXT NOT NULL DEFAULT '',
  client_phone      TEXT NOT NULL DEFAULT '',
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          INTEGER NOT NULL DEFAULT 0,
  tax_amount        INTEGER NOT NULL DEFAULT 0,
  total             INTEGER NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'INR'
                    CHECK (currency IN ('INR', 'AED', 'USD')),
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  issued_date       DATE,
  due_date          DATE,
  paid_amount       INTEGER NOT NULL DEFAULT 0,
  payment_history   JSONB NOT NULL DEFAULT '[]',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_quote     ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date  ON invoices(due_date);

-- --------------------------------------------------------------------
-- Notifications
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  link        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- --------------------------------------------------------------------
-- Notes
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'quotation')),
  entity_id   TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(entity_type, entity_id, pinned);

-- --------------------------------------------------------------------
-- Settings (free-form KV; one row per setting key)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- Commission tracking lives inside quotations.data (JSONB), under the
-- "commission" key. No schema change needed; application reads/writes it
-- via the existing storage path. Shape (all monetary values minor units):
--   commission: {
--     supplier_commission_pct: number,
--     supplier_commission_amount: number,
--     agent_commission_pct: number,
--     agent_commission_amount: number,
--     status: 'pending' | 'invoiced' | 'received' | 'paid_out',
--     notes: string
--   }
--
-- Analytics aggregates can read it with:
--   data->'commission'->>'supplier_commission_amount'
-- --------------------------------------------------------------------
