-- 009_add_clothing_category.sql
-- Add a new maker category to Craft Atlas: clothing (label "Clothing").
--
-- Same shape as 008: on the live craft-atlas DB the venues primary category
-- lives in column `category`, whose enum TYPE is ALSO named `category` (schema
-- public). NB the repo's supabase_migration_craft_atlas.sql is stale (shows
-- `type craft_category`); the live backing type is `public.category` (confirmed
-- via PostgREST OpenAPI: format "public.category"). So the ALTER targets
-- public.category, NOT craft_category (which does not exist on the live DB).
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block that
-- also uses the new value, so run this on its own. IF NOT EXISTS = idempotent.

alter type public.category add value if not exists 'clothing';
