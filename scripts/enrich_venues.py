#!/usr/bin/env python3
"""
SBA Venue Enrichment Script
============================
Pulls all published venues from Supabase, sends them to Claude Haiku
for semiotic enrichment, and upserts results back into the enrichment
and enrichment_confidence columns.

Usage:
  python enrich_venues.py                  # Skip already-enriched venues
  python enrich_venues.py --force          # Re-enrich all venues
  python enrich_venues.py --limit 50       # Test run on first 50 venues
  python enrich_venues.py --resume         # Resume from enrichment_log.json

Env vars required:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
  ANTHROPIC_API_KEY
"""

import os
import sys
import json
import time
import argparse
import traceback
from datetime import datetime
from typing import Optional

import anthropic
from supabase import create_client, Client

# ── Config ────────────────────────────────────────────────────────────────────

BATCH_SIZE = 10          # Venues per Claude call
RATE_LIMIT_DELAY = 0.5   # Seconds between batches
MAX_RETRIES = 3
RETRY_DELAY = 5          # Seconds before retry
LOG_FILE = os.path.join(os.path.dirname(__file__), "enrichment_log.json")
MODEL = "claude-haiku-4-5"

# ── Claude system prompt ──────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a craft beverage and hospitality expert enriching a curated Australian venue directory. For each venue, analyse the provided data and return a structured JSON enrichment object.

RULES:
- Return ONLY a JSON array, one object per venue, in the same order as input
- No preamble, no markdown fences, no explanation — raw JSON array only
- Infer cautiously. When data is sparse, reason from venue name, type, and location
- Never hallucinate specific details not supported by the data
- Set enrichment_confidence (0.0–1.0) based on data richness:
  - 0.9+ : rich description + features + spirit_types all present
  - 0.6–0.9 : description present but sparse, or features only
  - 0.3–0.6 : name and type only, inference required
  - below 0.3 : almost no data, minimal inference possible

SCHEMA per venue:
{
  "id": "<venue id>",
  "enrichment_confidence": float,
  "enrichment": {
    "beverage_types": [],        // Granular: lager, pale_ale, pinot_noir, single_malt, dry_cider, etc
    "production_methods": [],    // barrel_aged, wild_ferment, natural_wine, solera, open_ferment, etc
    "vibe_tags": [],             // cellar_door, urban_taproom, working_farm, destination, roadside_stop, warehouse_brewery, etc
    "visitor_experience": [],    // tours, tastings, food_menu, accommodation, dog_friendly, family_friendly, events, etc
    "is_destination": bool,      // Worth a dedicated trip on its own merits
    "is_urban": bool,            // City or inner suburb location
    "has_cellar_door": bool,     // Physical visit / tasting experience available
    "quality_signals": [],       // award_winning, long_established, cult_following, experimental, highly_rated, etc
    "nearby_localities": [],     // Towns or suburbs within ~30min drive, for regional SEO
    "similarity_tags": []        // Flat merged tag set combining all above — used for recommendation diffing
  }
}

EXAMPLES:

Input venue (data-rich):
{
  "id": "abc123",
  "name": "Sailors Grave Brewing",
  "type": "brewery",
  "subtype": "craft_brewery",
  "description": "Remote East Gippsland brewery known for experimental wild ales, mixed fermentation, and barrel-aged sours. Cellar door open weekends. Strong cult following among serious beer enthusiasts.",
  "address": "Orbost, VIC",
  "state": "VIC",
  "sub_region": "East Gippsland",
  "features": ["cellar_door", "tours"],
  "spirit_types": []
}

Output (data-rich):
{
  "id": "abc123",
  "enrichment_confidence": 0.92,
  "enrichment": {
    "beverage_types": ["wild_ale", "sour", "mixed_fermentation", "barrel_aged_beer"],
    "production_methods": ["wild_ferment", "barrel_aged", "mixed_fermentation", "open_ferment"],
    "vibe_tags": ["destination", "remote", "cellar_door", "cult_brewery"],
    "visitor_experience": ["cellar_door", "tours"],
    "is_destination": true,
    "is_urban": false,
    "has_cellar_door": true,
    "quality_signals": ["cult_following", "experimental", "award_winning"],
    "nearby_localities": ["Orbost", "Bairnsdale", "Mallacoota", "Lakes Entrance"],
    "similarity_tags": ["wild_ale", "sour", "barrel_aged", "wild_ferment", "destination", "cellar_door", "remote", "cult_following", "experimental", "east_gippsland"]
  }
}

Input venue (data-sparse):
{
  "id": "def456",
  "name": "Blue Mountains Distillery",
  "type": "distillery",
  "subtype": null,
  "description": null,
  "address": "Katoomba, NSW",
  "state": "NSW",
  "sub_region": "Blue Mountains",
  "features": [],
  "spirit_types": []
}

Output (data-sparse):
{
  "id": "def456",
  "enrichment_confidence": 0.28,
  "enrichment": {
    "beverage_types": ["spirits"],
    "production_methods": [],
    "vibe_tags": ["destination", "cellar_door"],
    "visitor_experience": ["tastings"],
    "is_destination": true,
    "is_urban": false,
    "has_cellar_door": true,
    "quality_signals": [],
    "nearby_localities": ["Katoomba", "Leura", "Springwood", "Penrith"],
    "similarity_tags": ["spirits", "distillery", "blue_mountains", "destination", "nsw"]
  }
}"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_log() -> dict:
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            return json.load(f)
    return {"started_at": None, "completed": {}, "failed": {}}


def save_log(log: dict):
    with open(LOG_FILE, "w") as f:
        json.dump(log, f, indent=2)


def chunk(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def build_similarity_tags(enrichment: dict) -> list:
    """Flatten all tags into a single similarity_tags list."""
    tags = set()
    for key in ["beverage_types", "production_methods", "vibe_tags",
                "visitor_experience", "quality_signals"]:
        tags.update(enrichment.get(key, []))
    if enrichment.get("is_destination"):
        tags.add("destination")
    if enrichment.get("is_urban"):
        tags.add("urban")
    if enrichment.get("has_cellar_door"):
        tags.add("cellar_door")
    return sorted(tags)


# ── Core enrichment ───────────────────────────────────────────────────────────

def enrich_batch(client: anthropic.Anthropic, venues: list) -> list:
    """Send a batch of venues to Claude and return enrichment results."""
    user_content = json.dumps([
        {
            "id": v["id"],
            "name": v.get("name", ""),
            "type": v.get("type", ""),
            "subtype": v.get("subtype", ""),
            "description": v.get("description", ""),
            "address": v.get("address", ""),
            "state": v.get("state", ""),
            "sub_region": v.get("sub_region", ""),
            "features": v.get("features", []) or [],
            "spirit_types": v.get("spirit_types", []) or [],
        }
        for v in venues
    ], indent=2)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}]
            )
            raw = response.content[0].text.strip()

            # Strip accidental markdown fences
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            results = json.loads(raw)

            # Ensure similarity_tags is populated
            for r in results:
                if "enrichment" in r:
                    r["enrichment"]["similarity_tags"] = build_similarity_tags(r["enrichment"])

            return results

        except json.JSONDecodeError as e:
            print(f"  ⚠ JSON parse error (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
        except anthropic.RateLimitError:
            print(f"  ⚠ Rate limit hit (attempt {attempt}/{MAX_RETRIES}), waiting {RETRY_DELAY * attempt}s...")
            time.sleep(RETRY_DELAY * attempt)
        except Exception as e:
            print(f"  ⚠ Error (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)

    return []


def upsert_results(supabase: Client, results: list) -> tuple[int, int]:
    """Upsert enrichment results into Supabase. Returns (success, failed) counts."""
    success = 0
    failed = 0
    for r in results:
        try:
            supabase.table("venues").update({
                "enrichment": r["enrichment"],
                "enrichment_confidence": r["enrichment_confidence"],
            }).eq("id", r["id"]).execute()
            success += 1
        except Exception as e:
            print(f"  ✗ Upsert failed for {r['id']}: {e}")
            failed += 1
    return success, failed


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Enrich SBA venues with semiotic metadata")
    parser.add_argument("--force", action="store_true", help="Re-enrich all venues, including already-enriched ones")
    parser.add_argument("--limit", type=int, default=None, help="Only process N venues (for testing)")
    parser.add_argument("--resume", action="store_true", help="Skip venues marked complete in enrichment_log.json")
    args = parser.parse_args()

    # ── Env vars
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if not all([supabase_url, supabase_key, anthropic_key]):
        print("✗ Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY")
        sys.exit(1)

    supabase: Client = create_client(supabase_url, supabase_key)
    anthropic_client = anthropic.Anthropic(api_key=anthropic_key)

    # ── Load run log
    log = load_log()
    if not log["started_at"]:
        log["started_at"] = datetime.utcnow().isoformat()
    already_done = set(log["completed"].keys())

    print(f"\n{'='*60}")
    print(f"  SBA Venue Enrichment")
    print(f"  Model: {MODEL}")
    print(f"  Batch size: {BATCH_SIZE}")
    print(f"  Force: {args.force}")
    print(f"{'='*60}\n")

    # ── Fetch venues
    print("→ Fetching venues from Supabase...")
    query = supabase.table("venues").select(
        "id, name, type, subtype, description, address, state, sub_region, features, spirit_types, enrichment"
    ).eq("status", "published")

    if not args.force:
        query = query.is_("enrichment", "null")

    response = query.execute()
    venues = response.data

    if args.resume:
        venues = [v for v in venues if v["id"] not in already_done]

    if args.limit:
        venues = venues[:args.limit]

    total = len(venues)
    print(f"→ {total} venues to enrich\n")

    if total == 0:
        print("✓ Nothing to do. Use --force to re-enrich existing venues.")
        return

    # ── Process batches
    processed = 0
    total_success = 0
    total_failed = 0

    for i, batch in enumerate(chunk(venues, BATCH_SIZE)):
        batch_num = i + 1
        batch_ids = [v["id"] for v in batch]
        print(f"Batch {batch_num}/{-(-total // BATCH_SIZE)} — venues {processed+1}–{min(processed+len(batch), total)}")

        results = enrich_batch(anthropic_client, batch)

        if not results:
            print(f"  ✗ Batch failed entirely, logging as failed")
            for vid in batch_ids:
                log["failed"][vid] = {"failed_at": datetime.utcnow().isoformat()}
            save_log(log)
            processed += len(batch)
            continue

        success, failed = upsert_results(supabase, results)
        total_success += success
        total_failed += failed

        # Update log
        for r in results:
            log["completed"][r["id"]] = {
                "confidence": r.get("enrichment_confidence", 0),
                "completed_at": datetime.utcnow().isoformat(),
            }
        save_log(log)

        processed += len(batch)
        pct = int(processed / total * 100)
        avg_confidence = sum(r.get("enrichment_confidence", 0) for r in results) / len(results) if results else 0
        print(f"  ✓ {success} upserted, {failed} failed | avg confidence: {avg_confidence:.2f} | {pct}% complete")

        if i < (-(-total // BATCH_SIZE)) - 1:
            time.sleep(RATE_LIMIT_DELAY)

    # ── Summary
    print(f"\n{'='*60}")
    print(f"  Done.")
    print(f"  ✓ Success: {total_success}")
    print(f"  ✗ Failed:  {total_failed}")
    print(f"  Log:       {LOG_FILE}")
    print(f"{'='*60}\n")

    # Low confidence report
    low_confidence = [
        (vid, data["confidence"])
        for vid, data in log["completed"].items()
        if data.get("confidence", 1) < 0.4
    ]
    if low_confidence:
        print(f"⚠ {len(low_confidence)} venues with confidence < 0.4 (consider adding descriptions):")
        for vid, conf in sorted(low_confidence, key=lambda x: x[1])[:10]:
            print(f"  {vid}: {conf:.2f}")
        if len(low_confidence) > 10:
            print(f"  ... and {len(low_confidence) - 10} more. Check {LOG_FILE} for full list.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠ Interrupted. Progress saved to enrichment_log.json — resume with --resume flag.")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)
