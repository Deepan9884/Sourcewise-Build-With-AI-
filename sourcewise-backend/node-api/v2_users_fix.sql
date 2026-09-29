-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
