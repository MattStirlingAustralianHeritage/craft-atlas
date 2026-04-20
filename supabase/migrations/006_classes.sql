-- 006: Add structured classes/workshops support to venues

ALTER TABLE venues ADD COLUMN IF NOT EXISTS offers_classes BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS classes JSONB;

CREATE INDEX IF NOT EXISTS idx_venues_offers_classes
  ON venues (offers_classes) WHERE offers_classes = true;

-- Extend the existing tier enforcement to also cover offers_classes
CREATE OR REPLACE FUNCTION enforce_experiences_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_tier = 'free' THEN
    NEW.experiences_and_classes := false;
    NEW.offers_classes := false;
    NEW.classes := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
