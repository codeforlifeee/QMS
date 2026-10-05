ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES quotations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_parent_id ON quotations(parent_id);
