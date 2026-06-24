// Browse/discovery data, served LIVE from the Australian Atlas master portal.
// The explore and map client components fetch this instead of reading the
// (frozen) local `venues` table, so browse mirrors the portal's curated set —
// the same source the detail pages and search now use. Service-role is never
// shipped to the client; this server route reads the portal with the anon key.
import { listPortalListings, listPortalMapEvents } from '@/lib/portal-data'

export const revalidate = 300

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const withEvents = searchParams.get('events') === '1'
  try {
    const [venues, events] = await Promise.all([
      listPortalListings(),
      withEvents ? listPortalMapEvents() : Promise.resolve([]),
    ])
    return Response.json({ venues, events })
  } catch (err) {
    console.error('[api/listings]', err?.message || err)
    return Response.json({ venues: [], events: [] })
  }
}
