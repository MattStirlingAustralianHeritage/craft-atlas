import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const REGION_MAP = {
  'victoria': 'VIC', 'vic': 'VIC',
  'new south wales': 'NSW', 'nsw': 'NSW',
  'queensland': 'QLD', 'qld': 'QLD',
  'south australia': 'SA', 'sa': 'SA',
  'western australia': 'WA', 'wa': 'WA',
  'tasmania': 'TAS', 'tas': 'TAS',
  'northern territory': 'NT', 'nt': 'NT',
  'australian capital territory': 'ACT', 'act': 'ACT',
  'canberra': 'ACT',
};

const CITY_REGION_MAP = {
  'perth': 'Perth', 'fremantle': 'Fremantle',
  'sydney': 'Sydney', 'melbourne': 'Melbourne',
  'brisbane': 'Brisbane', 'adelaide': 'Adelaide',
  'hobart': 'Hobart', 'launceston': 'Launceston',
  'geelong': 'Geelong', 'ballarat': 'Ballarat',
  'bendigo': 'Bendigo', 'mornington': 'Mornington Peninsula',
  'yarra valley': 'Yarra Valley', 'barossa': 'Barossa Valley',
  'hunter valley': 'Hunter Valley', 'margaret river': 'Margaret River',
  'clare valley': 'Clare Valley', 'mclaren vale': 'McLaren Vale',
  'yarra river': 'Melbourne',
};

function detectRegion(message) {
  const lower = message.toLowerCase();
  for (const [city, subregion] of Object.entries(CITY_REGION_MAP)) {
    const regex = new RegExp(`\\b${city.replace(' ', '\\s')}\\b`, 'i');
    if (regex.test(lower)) return { type: 'sub_region', value: subregion };
  }
  for (const [name, code] of Object.entries(REGION_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(lower)) return { type: 'state', value: code };
  }
  return null;
}

async function fetchVenues(region, limit = 80) {
  let query = supabase
    .from('venues')
    .select('id, name, slug, type, subtype, description, state, sub_region, google_rating, is_verified, custom_tags, tags, opening_hours')
    .not('description', 'is', null)
    .limit(limit);

  if (region) {
    if (region.type === 'sub_region') {
      query = query.ilike('sub_region', `%${region.value}%`);
    } else {
      query = query.eq('state', region.value);
    }
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

function buildVenueContext(venues) {
  return venues.map(v => {
    const rating = v.google_rating ? ` Rating: ${v.google_rating}.` : '';
    const verified = v.is_verified ? ' [Verified]' : '';
    const tags = [...(v.custom_tags || []), ...(v.tags || [])].filter(Boolean);
    const tagStr = tags.length > 0 ? ` Tags: ${tags.join(', ')}.` : '';
    const hours = v.opening_hours ? ` Hours: ${v.opening_hours}.` : '';
    return `- ${v.name} (${v.type}${v.subtype ? '/' + v.subtype : ''}) in ${v.sub_region || v.state}.${verified} ${v.description || ''}${rating}${tagStr}${hours} URL: https://www.craftatlas.com.au/venue/${v.slug}`;
  }).join('\n');
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || '';

    const region = detectRegion(lastMessage);
    let venues = await fetchVenues(region, 80);

    if (venues.length === 0 && region?.type === 'sub_region') {
      const stateEntries = Object.entries(REGION_MAP);
      for (const [city, subregion] of Object.entries(CITY_REGION_MAP)) {
        if (subregion === region.value) {
          for (const [stateName, stateCode] of stateEntries) {
            if (stateName.length > 3) {
              venues = await fetchVenues({ type: 'state', value: stateCode }, 80);
              if (venues.length > 0) break;
            }
          }
          break;
        }
      }
    }

    const venueContext = buildVenueContext(venues);

    const systemPrompt = `You are a discovery assistant for Craft Atlas, Australia's craft maker directory. Help users find makers and studios.

Available venues:
${venueContext}

Rules:
- Recommend 3-5 specific venues from the list above
- Include the URL for each venue so users can click through
- Be specific about what makes each venue worth visiting
- If tags include "dog friendly", "food", "live music", "kids", etc, mention these when relevant to the user's query
- Keep responses concise and conversational — no markdown bold or headers
- If asked about a region not in the list, say you don't have listings there yet
- Never make up venues not in the list above`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || 'Sorry, I could not find any venues matching your request.';
    const cleaned = content.replace(/\*\*/g, '');

    return NextResponse.json({ content: cleaned });
  } catch (error) {
    console.error('Discovery agent error:', error);
    return NextResponse.json({ content: 'Sorry, something went wrong. Please try again.' }, { status: 500 });
  }
}
