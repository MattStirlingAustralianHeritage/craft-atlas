-- ============================================================
-- Craft Atlas
-- Migration 002: Partial unique index on pending claims
-- DB-level guard: only one pending claim per venue at a time
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS claims_venue_pending_idx
  ON claims (venue_id)
  WHERE status = 'pending';
