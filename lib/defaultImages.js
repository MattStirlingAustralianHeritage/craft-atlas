// Deterministic default image selection based on venue ID
const DEFAULT_IMAGES = {
  winery: [1, 2, 3, 4, 5],
  brewery: [1, 2, 3, 4, 5],
  distillery: [1, 2, 3, 4, 5],
  cidery: [1, 2, 3, 4, 5],
  meadery: null,
}

export function getDefaultImage(type, id) {
  const nums = DEFAULT_IMAGES[type]
  if (!nums) return null
  const index = (id % nums.length) + 1
  return `/images/defaults/${type}-${index}.jpeg`
}
