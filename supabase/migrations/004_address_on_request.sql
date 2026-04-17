-- Address on Request: allow listings without a public street address
-- Note: Craft Atlas venues table already has suburb column

ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_on_request BOOLEAN DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS postcode TEXT;

CREATE INDEX IF NOT EXISTS idx_venues_address_on_request ON venues(address_on_request);
