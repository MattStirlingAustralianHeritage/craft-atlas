export const TYPE_COLORS = {
  distillery: '#c8943a',
  brewery: '#4a7c59',
  winery: '#8b4a6b',
  cidery: '#c45d3e',
  meadery: '#d4a843',
  sake_brewery: '#5a6e8a',
  non_alcoholic: '#3a8a7c',
}

export const TYPE_LABELS = {
  distillery: 'Distillery',
  brewery: 'Brewery',
  winery: 'Winery',
  cidery: 'Cidery',
  meadery: 'Meadery',
  sake_brewery: 'Sake Brewery',
  non_alcoholic: 'Non-Alcoholic',
}

export const TYPE_LABELS_PLURAL = {
  distillery: 'Distilleries',
  brewery: 'Breweries',
  winery: 'Wineries',
  cidery: 'Cideries',
  meadery: 'Meaderies',
  sake_brewery: 'Sake Breweries',
  non_alcoholic: 'Non-Alcoholic',
}

export const SPIRIT_LABEL = {
  winery: 'Varieties',
  brewery: 'Styles',
  distillery: 'Spirits',
  cidery: 'Varieties',
  meadery: 'Varieties',
  sake_brewery: 'Styles',
  non_alcoholic: 'Range',
}

export const STATES = ['All States', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

export const STATE_CENTERS = {
  'All States': { center: [134, -28], zoom: 4 },
  'NSW': { center: [149.5, -32.5], zoom: 5.5 },
  'VIC': { center: [145.5, -37.2], zoom: 6 },
  'QLD': { center: [149, -23], zoom: 4.5 },
  'SA': { center: [137.5, -34], zoom: 5.5 },
  'WA': { center: [118, -30], zoom: 4.5 },
  'TAS': { center: [146.5, -42], zoom: 7 },
  'NT': { center: [133, -20], zoom: 5 },
  'ACT': { center: [149.13, -35.3], zoom: 10 },
}

export const TIERS = {
  free: { name: 'Free', price: 0, features: [] },
  standard: { name: 'Standard', price: 199, features: ['description', 'photos', 'hours'] },
  premium: { name: 'Premium', price: 499, features: ['description', 'photos', 'hours', 'video', 'featured'] },
}

export function canUse(tier, feature) {
  const t = TIERS[tier]
  if (!t) return false
  return t.features.includes(feature)
}

export const REGIONS = [
  { name: 'Barossa Valley', state: 'SA' },
  { name: 'Margaret River', state: 'WA' },
  { name: 'Yarra Valley', state: 'VIC' },
  { name: 'Hunter Valley', state: 'NSW' },
  { name: 'Tamar Valley', state: 'TAS' },
  { name: 'McLaren Vale', state: 'SA' },
  { name: 'Mornington Peninsula', state: 'VIC' },
  { name: 'Granite Belt', state: 'QLD' },
]

export const REGION_INFO = {
  'barossa-valley': {
    name: 'Barossa Valley', state: 'SA',
    description: "Australia's most iconic wine region, the Barossa Valley has been producing world-class Shiraz and Grenache since the 1840s. German settlers established many of the valley's original vineyards, and that heritage lives on in the region's architecture, food, and winemaking traditions. Today it's home to over 150 wineries alongside a growing craft spirits scene.",
  },
  'margaret-river': {
    name: 'Margaret River', state: 'WA',
    description: "Nestled between ancient forests and the Indian Ocean, Margaret River produces some of Australia's finest Cabernet Sauvignon and Chardonnay. The region's maritime climate and gravelly soils create wines of elegance and structure.",
  },
  'yarra-valley': {
    name: 'Yarra Valley', state: 'VIC',
    description: "Just an hour from Melbourne, the Yarra Valley is Victoria's oldest wine region, first planted in 1838. Cool-climate Pinot Noir and Chardonnay are the stars, but the valley also hosts some of Australia's most celebrated gin distilleries and craft breweries.",
  },
  'hunter-valley': {
    name: 'Hunter Valley', state: 'NSW',
    description: "Australia's oldest wine region, the Hunter Valley has been producing Semillon and Shiraz since the 1820s. Located just two hours north of Sydney, it's one of the country's most visited wine destinations.",
  },
  'tamar-valley': {
    name: 'Tamar Valley', state: 'TAS',
    description: "Winding through northern Tasmania, the Tamar Valley is home to some of Australia's finest cool-climate wines and a remarkable concentration of craft distilleries.",
  },
  'mclaren-vale': {
    name: 'McLaren Vale', state: 'SA',
    description: "Where the Adelaide Hills meet the sea, McLaren Vale produces rich, generous Shiraz and Grenache from some of Australia's oldest vines.",
  },
  'mornington-peninsula': {
    name: 'Mornington Peninsula', state: 'VIC',
    description: "Melbourne's coastal playground, the Mornington Peninsula is a cool-climate wine region known for elegant Pinot Noir and Chardonnay.",
  },
  'granite-belt': {
    name: 'Granite Belt', state: 'QLD',
    description: "Queensland's premier wine region sits high on the Great Dividing Range, where altitude and granite soils create surprisingly cool conditions for wine production.",
  },
  'adelaide-hills': {
    name: 'Adelaide Hills', state: 'SA',
    description: "The cool, elevated Adelaide Hills produce some of Australia's finest Sauvignon Blanc, Chardonnay, and Pinot Noir.",
  },
  'swan-valley': {
    name: 'Swan Valley', state: 'WA',
    description: "Western Australia's oldest wine region lies just 25 minutes from Perth's CBD.",
  },
  'rutherglen': {
    name: 'Rutherglen', state: 'VIC',
    description: "Rutherglen is legendary for its fortified Muscat and Tokay — luscious, complex wines found nowhere else on earth.",
  },
  'coonawarra': {
    name: 'Coonawarra', state: 'SA',
    description: "Famous for its distinctive terra rossa soil — a thin strip of red earth over limestone — Coonawarra produces some of Australia's greatest Cabernet Sauvignon.",
  },
}
