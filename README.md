# Craft Atlas

A place-based directory of Australian makers, artists, and studios. Built with Next.js 14, Supabase, Mapbox GL, and Stripe.

## Setup

1. Copy `.env.example` to `.env.local` and fill in your credentials
2. `npm install`
3. `npm run dev`
4. Visit `http://localhost:3000`

## Deploy

Push to the `main` branch — Vercel handles the rest.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Craft Atlas Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox GL access token
- `NEXT_PUBLIC_SITE_URL` — Production URL (https://www.craftatlas.com.au)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_STANDARD_PRICE_ID` — Stripe price ID for Standard tier
- `ANTHROPIC_API_KEY` — Anthropic API key (discovery agent, search, newsletter)
- `RESEND_API_KEY` — Resend email API key
