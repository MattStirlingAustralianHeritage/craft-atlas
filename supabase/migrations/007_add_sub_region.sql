-- ============================================================
-- 007_add_sub_region.sql
--
-- Adds a `sub_region` text column to `venues` so the portal sync
-- can write the resolved region name (override → computed → legacy
-- → null) into a dedicated column, separate from `suburb`.
--
-- Render path is intentionally unchanged in this migration — the
-- detail page continues to read `suburb`. A separate, deliberate
-- read-side change in a later session (after backfill is complete)
-- will switch the render to read `sub_region`.
--
-- Additive, nullable, idempotent. No data is moved or rewritten.
-- ============================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS sub_region TEXT;
