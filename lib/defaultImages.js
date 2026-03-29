// Deterministic default image selection based on venue ID
const DEFAULT_IMAGES = {
  ceramics_clay: [1, 2, 3, 4, 5],
  visual_art: [1, 2, 3, 4, 5],
  jewellery_metalwork: [1, 2, 3, 4, 5],
  textile_fibre: [1, 2, 3, 4, 5],
  wood_furniture: [1, 2, 3, 4, 5],
  glass: [1, 2, 3, 4, 5],
  printmaking: [1, 2, 3, 4, 5],
}

export function getDefaultImage(type, id) {
  const nums = DEFAULT_IMAGES[type]
  if (!nums) return null
  const index = (id % nums.length) + 1
  return `/images/defaults/${type}-${index}.jpeg`
}
