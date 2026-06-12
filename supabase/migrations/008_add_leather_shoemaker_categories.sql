-- 008_add_leather_shoemaker_categories.sql
-- Add two new maker categories to Craft Atlas: leathermaker, shoemaker.
--
-- On the live craft-atlas DB the venues primary category lives in column
-- `category`, whose enum TYPE is ALSO named `category` (schema public). NB the
-- repo's supabase_migration_craft_atlas.sql is stale: it shows `type
-- craft_category`, but on the live DB the column was renamed `type` -> `category`
-- AND the backing enum type is `public.category` (confirmed via PostgREST
-- OpenAPI: format "public.category"). So the ALTER targets public.category, NOT
-- craft_category (which does not exist on the live DB).
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block that
-- also uses the new value, so run this on its own. IF NOT EXISTS = idempotent.

alter type public.category add value if not exists 'leathermaker';
alter type public.category add value if not exists 'shoemaker';
