-- Add online shop URL and commission status to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS online_shop_url text;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS accepting_commissions boolean DEFAULT false;
