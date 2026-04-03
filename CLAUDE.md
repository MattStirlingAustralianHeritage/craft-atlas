# Craft Atlas

Part of the 9-vertical Australian Atlas Network. Craft Atlas is the craft beer and breweries vertical.

## Tech Stack

- **Framework**: Next.js 14, App Router
- **Database**: Supabase
- **Hosting**: Vercel
- **Maps**: Mapbox

## Key Conventions

- All pages use App Router conventions (lowercase `page.js`, `layout.js`)
- API routes live under `app/api/`
- Components are client components only when they need interactivity (`"use client"`)

## Data Integrity Rules

- Website URLs must never be AI-generated. They may only be populated from: Google Places API data, operator-submitted data, or manually verified sources. Any URL not from one of these sources must be nulled before publishing.
- All venue tables should include `data_source` (text: 'ai_generated' | 'google_places' | 'operator_verified' | 'manually_curated') and `needs_review` (boolean, default false) columns.
- Venues with `needs_review = true` must not be rendered publicly — return 404 on detail pages.
- AI-generated descriptions should show a disclaimer: "Description auto-generated. Own this listing? Claim it to update."
- Never render a "Visit Website" button if website_url is null.
- Homepage stat numbers link to /map?type=[value] for pre-filtered map views.
- The /explore page reads ?region= URL params on mount for pre-filtered views from homepage city cards.
