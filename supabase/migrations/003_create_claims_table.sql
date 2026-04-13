-- Create claims table for Craft Atlas
-- Required by app/api/claim/route.js and admin workflows

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  venue_id UUID NOT NULL,
  venue_name TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  selected_tier TEXT DEFAULT 'free',
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'transfer_pending')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index: only one pending claim per venue
CREATE UNIQUE INDEX IF NOT EXISTS claims_venue_pending_idx
  ON claims (venue_id)
  WHERE status = 'pending';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status);
CREATE INDEX IF NOT EXISTS idx_claims_venue_id ON claims (venue_id);
CREATE INDEX IF NOT EXISTS idx_claims_contact_email ON claims (contact_email);

-- Enable RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
