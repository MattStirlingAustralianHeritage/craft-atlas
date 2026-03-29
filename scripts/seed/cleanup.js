/**
 * cleanup.js — Delete non-craft venues from Supabase
 *
 * Removes venues that are not craft businesses (wineries, breweries,
 * digital agencies, big-box stores, etc.)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually to avoid dotenv override issues
const envContent = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(l => { const m = l.match(/^([^#=]+)=(.*)$/); if(m) env[m[1].trim()]=m[2].trim() });

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Exact-match patterns (case-insensitive)
const EXACT_PATTERNS = [
  'officeworks',
  'four pillars gin',
  'art & wine co',
  'grendesign',
  'australian opal company',
  'daylesford hot chocolate',
  'fast forward digital',
  'high res digital',
  'pop digital',
  'wild digital',
];

// "Digital Works" but NOT if name also contains art/craft/print/studio
const DIGITAL_WORKS_PATTERN = /digital\s*works/i;
const DIGITAL_WORKS_EXCEPTIONS = /art|craft|print|studio/i;

// Broader sweep patterns (substring, case-insensitive)
const BROAD_PATTERNS = [
  'winery',
  'wine bar',
  'distillery',
  'brewery',
  'advertising agency',
  'marketing agency',
  'real estate',
  'officeworks',
  'bunnings',
];

async function main() {
  console.log('Fetching all venues...');

  // Fetch all venues (paginate in case there are many)
  let allVenues = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching venues:', error.message);
      process.exit(1);
    }

    allVenues = allVenues.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Total venues in database: ${allVenues.length}`);

  // Find venues to delete
  const toDelete = [];

  for (const venue of allVenues) {
    const name = venue.name || '';
    const nameLower = name.toLowerCase();

    // Check exact patterns
    let matched = EXACT_PATTERNS.some(p => nameLower === p.toLowerCase());

    // Check Digital Works (with exceptions)
    if (!matched && DIGITAL_WORKS_PATTERN.test(name) && !DIGITAL_WORKS_EXCEPTIONS.test(name)) {
      matched = true;
    }

    // Check broad substring patterns
    if (!matched) {
      matched = BROAD_PATTERNS.some(p => nameLower.includes(p.toLowerCase()));
    }

    if (matched) {
      toDelete.push(venue);
    }
  }

  if (toDelete.length === 0) {
    console.log('No non-craft venues found to delete.');
    return;
  }

  console.log(`\nFound ${toDelete.length} non-craft venues to delete:`);
  toDelete.forEach(v => console.log(`  - ${v.name} (id: ${v.id})`));

  // Delete in batches of 100
  const BATCH_SIZE = 100;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE).map(v => v.id);
    const { error } = await supabase
      .from('venues')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`Error deleting batch: ${error.message}`);
    } else {
      deleted += batch.length;
    }
  }

  console.log(`\nDeleted ${deleted} non-craft venues.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
