/**
 * "Atlas Paper" — the network's canonical light basemap.
 *
 * This is the hosted Mapbox Studio style used across the whole Australian Atlas
 * network — the SAME style the portal (australianatlas.com.au) renders on its
 * homepage hero and on /map. Every vertical surface points at it so the
 * cartography is identical warm "paper" everywhere: hero backdrops, /map,
 * nearby maps, trail routes, the trail builder.
 *
 * (An earlier in-repo code-object approximation of this style rendered
 * colder/greyer than the hosted original — notably a grey-blue ocean instead of
 * the warm paper wash — so the network standard is the hosted style below.)
 */
export const ATLAS_PAPER_STYLE = 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k'

// Callers that guard pin insertion under the basemap's label layers reference
// this id. The hosted style has no 'atlas-water-label' layer, so getLayer()
// returns null and pins are added on top — matching the portal's /map.
export const ATLAS_LABEL_ROOF = 'atlas-water-label'
