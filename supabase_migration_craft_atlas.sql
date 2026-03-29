-- Craft Atlas — Supabase Migration
-- Creates the venues table with Craft Atlas-specific fields and categories

-- Create category enum
CREATE TYPE craft_category AS ENUM (
  'ceramics_clay',
  'visual_art',
  'jewellery_metalwork',
  'textile_fibre',
  'wood_furniture',
  'glass',
  'printmaking'
);

-- Create subcategory enum
CREATE TYPE craft_subcategory AS ENUM (
  -- ceramics_clay
  'functional_ware', 'sculptural_ceramics', 'porcelain', 'stoneware',
  -- visual_art
  'painting', 'drawing', 'printmaking_sub', 'sculpture', 'installation',
  -- jewellery_metalwork
  'fine_jewellery', 'silversmithing', 'blacksmithing', 'casting',
  -- textile_fibre
  'weaving', 'tapestry', 'natural_dye', 'embroidery', 'basketry', 'fibre_sculpture',
  -- wood_furniture
  'furniture_making', 'woodturning', 'carving', 'cabinetry',
  -- glass
  'blown_glass', 'cast_glass', 'stained_glass', 'lampworking',
  -- printmaking
  'relief', 'screen_printing', 'etching', 'lithography'
);

-- Create listing tier enum
CREATE TYPE listing_tier AS ENUM ('free', 'standard');

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Core fields
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type craft_category NOT NULL,
  subcategories craft_subcategory[] DEFAULT '{}',
  description text,
  practice_description text,  -- maker-specific description of process and medium

  -- Location
  address text,
  state text,
  sub_region text,
  latitude double precision,
  longitude double precision,

  -- Contact
  phone text,
  email text,
  website text,

  -- Media
  hero_image_url text,
  photos text[] DEFAULT '{}',

  -- Business details
  opening_hours jsonb,
  social_links jsonb,

  -- Craft Atlas-specific fields
  materials text[] DEFAULT '{}',  -- e.g. ["stoneware", "porcelain"]
  commission_available boolean DEFAULT false,
  experiences_and_classes boolean DEFAULT false,  -- Standard tier only

  -- Listing management
  listing_tier listing_tier DEFAULT 'free',
  status text DEFAULT 'active',
  claimed boolean DEFAULT false,
  claimed_by uuid REFERENCES auth.users(id),
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Discovery
  google_rating numeric(2,1),
  google_rating_count integer,
  google_place_id text,

  -- Embedding for semantic search
  embedding vector(1536)
);

-- Indexes
CREATE INDEX idx_venues_type ON venues(type);
CREATE INDEX idx_venues_state ON venues(state);
CREATE INDEX idx_venues_slug ON venues(slug);
CREATE INDEX idx_venues_status ON venues(status);
CREATE INDEX idx_venues_listing_tier ON venues(listing_tier);
CREATE INDEX idx_venues_experiences ON venues(experiences_and_classes) WHERE experiences_and_classes = true;
CREATE INDEX idx_venues_location ON venues USING gist (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- RLS policies
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Public read access for active venues
CREATE POLICY "Public can view active venues"
  ON venues FOR SELECT
  USING (status = 'active');

-- Venue owners can update their own venues
CREATE POLICY "Owners can update their venues"
  ON venues FOR UPDATE
  USING (auth.uid() = claimed_by);

-- Enforce: free tier cannot have experiences_and_classes = true
CREATE OR REPLACE FUNCTION enforce_experiences_tier()
RETURNS trigger AS $$
BEGIN
  IF NEW.listing_tier = 'free' AND NEW.experiences_and_classes = true THEN
    NEW.experiences_and_classes := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_experiences_tier_trigger
  BEFORE INSERT OR UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION enforce_experiences_tier();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
