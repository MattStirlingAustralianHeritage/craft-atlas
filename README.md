# Small Batch Atlas — Next.js Migration (Phase 1)

## What's Included

This is the complete Phase 1 scaffold: the SEO-critical public pages migrated to Next.js App Router with full SSR/SSG.

### Pages

| Route | Rendering | What it does |
|---|---|---|
| `/` | SSR | Home page with venue counts, top regions, CTA |
| `/explore` | SSR + ISR (1hr) | Filterable venue grid with pagination |
| `/venue/[slug]` | **SSG + ISR (24hr)** | Full venue detail — JSON-LD, breadcrumbs, nearby venues, map |
| `/region/[slug]` | SSG + ISR (24hr) | Region page with all venues in that area |
| `/map` | Client-side | Interactive Mapbox map (no SSR needed) |
| `/sitemap.xml` | Dynamic | Auto-generated from all venues + regions |
| `/robots.txt` | Dynamic | Search engine directives |

### Key Files

```
sba-nextjs/
├── app/
│   ├── layout.js          ← Root layout (nav, footer, global meta)
│   ├── page.js            ← Home page
│   ├── globals.css         ← Tailwind + SBA custom styles
│   ├── sitemap.js          ← Dynamic sitemap from Supabase
│   ├── robots.js           ← robots.txt
│   ├── not-found.js        ← Custom 404
│   ├── explore/
│   │   ├── page.js         ← Explore page (server)
│   │   └── ExploreFilters.js ← Filter controls (client)
│   ├── venue/[slug]/
│   │   ├── page.js         ← Venue detail (SSG + ISR)
│   │   └── VenueMap.js     ← Mapbox embed (client)
│   ├── region/[slug]/
│   │   └── page.js         ← Region page (SSG + ISR)
│   └── map/
│       ├── page.js         ← Interactive map (client)
│       └── layout.js       ← Map metadata
├── components/
│   ├── Nav.js              ← Site navigation
│   └── Footer.js           ← Site footer
├── lib/
│   ├── supabase.js         ← Supabase client (server + client)
│   └── jsonLd.js           ← JSON-LD structured data generators
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── package.json
└── .env.local.example
```

## Setup Steps

### 1. Create a new repo

Create a new folder (or new Git repo) for the Next.js version. Don't overwrite the old Vite project — keep it as a fallback.

### 2. Copy all these files in

Drop the entire directory structure into your new project folder.

### 3. Create `.env.local`

Copy `.env.local.example` to `.env.local` and fill in your keys:
- Supabase URL is already set
- Add your Supabase anon key (from the existing project)
- Add your Mapbox token (from the existing project)

### 4. Install dependencies

```bash
npm install
```

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` and verify:
- Home page loads with venue count
- `/explore` shows the venue grid
- `/venue/[any-slug]` shows a full venue page
- `/map` shows the interactive map
- `/sitemap.xml` lists all URLs

### 6. Deploy to Vercel

In Vercel, create a new project pointing to the new repo (or update the existing project's root directory). Set the environment variables in Vercel's dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

## What's NOT Included (Phase 2+)

These pages still need migrating from the old Vite app:
- `/claim` and `/claim/:slug` — Claim flow
- `/admin` — Admin dashboard
- `/vendor/*` — Vendor portal (login, dashboard, claim)
- `/journal` — Journal/blog pages
- `/about` — About page

These are all either behind auth or lower SEO priority, so they can be migrated incrementally. The admin and vendor pages can stay client-side rendered since Google doesn't need to index them.

## How ISR Works

The venue and region pages use **Incremental Static Regeneration**:
1. At build time, Next.js generates static HTML for every venue and region
2. When someone visits a page, they get instant static HTML
3. Every 24 hours, the page regenerates in the background with fresh data
4. Google sees full HTML with structured data on every crawl

This means your 2,600+ venue pages are pre-rendered and instantly indexable.
