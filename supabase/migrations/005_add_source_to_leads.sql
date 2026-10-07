-- Add the 'source' column to the 'leads' table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT;
