export const TYPE_COLORS = {
  ceramics_clay: '#C1603A',
  visual_art: '#7A8C7E',
  jewellery_metalwork: '#C49A3C',
  textile_fibre: '#8B6B8A',
  wood_furniture: '#8A7055',
  glass: '#5A8A9A',
  printmaking: '#6B7A5A',
}

export const TYPE_LABELS = {
  ceramics_clay: 'Ceramics & Clay',
  visual_art: 'Visual Art',
  jewellery_metalwork: 'Jewellery & Metalwork',
  textile_fibre: 'Textile & Fibre',
  wood_furniture: 'Wood & Furniture',
  glass: 'Glass',
  printmaking: 'Printmaking',
}

export const TYPE_LABELS_PLURAL = {
  ceramics_clay: 'Ceramics & Clay',
  visual_art: 'Visual Art',
  jewellery_metalwork: 'Jewellery & Metalwork',
  textile_fibre: 'Textile & Fibre',
  wood_furniture: 'Wood & Furniture',
  glass: 'Glass',
  printmaking: 'Printmaking',
}

export const SUBCATEGORIES = {
  ceramics_clay: ['functional_ware', 'sculptural_ceramics', 'porcelain', 'stoneware'],
  visual_art: ['painting', 'drawing', 'printmaking_sub', 'sculpture', 'installation'],
  jewellery_metalwork: ['fine_jewellery', 'silversmithing', 'blacksmithing', 'casting'],
  textile_fibre: ['weaving', 'tapestry', 'natural_dye', 'embroidery', 'basketry', 'fibre_sculpture'],
  wood_furniture: ['furniture_making', 'woodturning', 'carving', 'cabinetry'],
  glass: ['blown_glass', 'cast_glass', 'stained_glass', 'lampworking'],
  printmaking: ['relief', 'screen_printing', 'etching', 'lithography'],
}

export const SUBCATEGORY_LABELS = {
  functional_ware: 'Functional Ware',
  sculptural_ceramics: 'Sculptural Ceramics',
  porcelain: 'Porcelain',
  stoneware: 'Stoneware',
  painting: 'Painting',
  drawing: 'Drawing',
  printmaking_sub: 'Printmaking',
  sculpture: 'Sculpture',
  installation: 'Installation',
  fine_jewellery: 'Fine Jewellery',
  silversmithing: 'Silversmithing',
  blacksmithing: 'Blacksmithing',
  casting: 'Casting',
  weaving: 'Weaving',
  tapestry: 'Tapestry',
  natural_dye: 'Natural Dye',
  embroidery: 'Embroidery',
  basketry: 'Basketry',
  fibre_sculpture: 'Fibre Sculpture',
  furniture_making: 'Furniture Making',
  woodturning: 'Woodturning',
  carving: 'Carving',
  cabinetry: 'Cabinetry',
  blown_glass: 'Blown Glass',
  cast_glass: 'Cast Glass',
  stained_glass: 'Stained Glass',
  lampworking: 'Lampworking',
  relief: 'Relief',
  screen_printing: 'Screen Printing',
  etching: 'Etching',
  lithography: 'Lithography',
}

export const PRACTICE_LABEL = {
  ceramics_clay: 'Practice',
  visual_art: 'Practice',
  jewellery_metalwork: 'Practice',
  textile_fibre: 'Practice',
  wood_furniture: 'Practice',
  glass: 'Practice',
  printmaking: 'Practice',
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
  standard: { name: 'Standard', price: 99, features: ['description', 'photos', 'hours', 'booking_link', 'social_links', 'practice_description', 'experiences_and_classes', 'featured_video', 'promotions', 'qr_codes', 'analytics'] },
}

export function canUse(tier, feature) {
  const t = TIERS[tier]
  if (!t) return false
  return t.features.includes(feature)
}

export const REGIONS = [
  { name: 'Blue Mountains', state: 'NSW' },
  { name: 'Byron Bay Hinterland', state: 'NSW' },
  { name: 'Yarra Valley', state: 'VIC' },
  { name: 'Daylesford', state: 'VIC' },
  { name: 'Adelaide Hills', state: 'SA' },
  { name: 'Huon Valley', state: 'TAS' },
  { name: 'Margaret River', state: 'WA' },
  { name: 'Sunshine Coast Hinterland', state: 'QLD' },
]

export const REGION_INFO = {
  'blue-mountains': {
    name: 'Blue Mountains', state: 'NSW',
    description: "A creative haven in the sandstone escarpments west of Sydney, the Blue Mountains attracts ceramicists, painters, and printmakers drawn to its dramatic landscapes and tight-knit arts community. Open studio trails and gallery cooperatives thrive here year-round.",
  },
  'byron-bay-hinterland': {
    name: 'Byron Bay Hinterland', state: 'NSW',
    description: "The rolling green hills behind Byron Bay are home to a thriving community of makers — from textile artists and potters to jewellers and furniture makers. Markets, open studios, and creative retreats define this subtropical creative hub.",
  },
  'yarra-valley': {
    name: 'Yarra Valley', state: 'VIC',
    description: "Just an hour from Melbourne, the Yarra Valley's gentle landscape supports a growing community of ceramicists, glass artists, and woodworkers. Farm-gate studios and maker weekends draw visitors year-round.",
  },
  'daylesford': {
    name: 'Daylesford', state: 'VIC',
    description: "Daylesford and the surrounding Hepburn Shire form one of Australia's richest creative clusters. Potters, weavers, jewellers, and painters work from converted barns and bushland studios throughout the region.",
  },
  'adelaide-hills': {
    name: 'Adelaide Hills', state: 'SA',
    description: "The cool, elevated Adelaide Hills nurture a community of makers working in ceramics, wood, metal, and fibre. Studio trails wind through villages like Hahndorf, Stirling, and Lobethal.",
  },
  'huon-valley': {
    name: 'Huon Valley', state: 'TAS',
    description: "South of Hobart, the Huon Valley is a haven for woodworkers, glass artists, and ceramicists. Tasmania's rich timber heritage and wild landscapes inspire makers who settle in this quiet, creative corner.",
  },
  'margaret-river': {
    name: 'Margaret River', state: 'WA',
    description: "Nestled between ancient forests and the Indian Ocean, Margaret River supports a vibrant arts community. Ceramicists, painters, glass blowers, and woodworkers draw inspiration from the region's dramatic coastline and towering karri forests.",
  },
  'sunshine-coast-hinterland': {
    name: 'Sunshine Coast Hinterland', state: 'QLD',
    description: "The lush hinterland behind the Sunshine Coast is home to potters, jewellers, textile artists, and printmakers. Montville, Maleny, and Mapleton host galleries, open studios, and weekend art trails.",
  },
}
